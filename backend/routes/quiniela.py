from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
import os
from sqlalchemy.exc import IntegrityError
from datetime import datetime
 
from extensions import db
from jobs.score_calculator import maybe_calculate_scores
from models import (
    User, QuinielaProfile, Prediction, PredictionScore,
    PrivateLeague, LeagueMember, QuinielaChampion,
)
 
quiniela_bp = Blueprint('quiniela', __name__)
 
# ── Helpers ───────────────────────────────────────────────────────────
 
def _get_profile_or_404(user_id):
    return QuinielaProfile.query.filter_by(user_id=user_id).first()
 
def _winner(home, away):
    """Returns 'home', 'away', or 'draw'."""
    if home > away:  return 'home'
    if away > home:  return 'away'
    return 'draw'
 
 
# ─────────────────────────────────────────────────────────────────────
# PROFILE
# ─────────────────────────────────────────────────────────────────────
 
@quiniela_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    user_id = int(get_jwt_identity())
    profile = _get_profile_or_404(user_id)
    if not profile:
        return jsonify({'profile': None}), 200
    return jsonify({'profile': profile.to_dict()}), 200
 
 
@quiniela_bp.route('/profile', methods=['POST'])
@jwt_required()
def create_or_update_profile():
    user_id = int(get_jwt_identity())
    data    = request.get_json(silent=True) or {}
 
    alias        = (data.get('alias') or '').strip()
    avatar_color = data.get('avatar_color', '#f0b429')
 
    if not alias:
        return jsonify({'error': 'alias is required'}), 400
    if len(alias) < 3 or len(alias) > 30:
        return jsonify({'error': 'alias must be between 3 and 30 characters'}), 400
    if not alias.replace('_', '').replace('-', '').isalnum():
        return jsonify({'error': 'alias can only contain letters, numbers, hyphens and underscores'}), 400
 
    profile = _get_profile_or_404(user_id)
    if profile:
        # Update existing
        # Check alias uniqueness only if it changed
        if alias != profile.alias:
            existing = QuinielaProfile.query.filter_by(alias=alias).first()
            if existing:
                return jsonify({'error': 'alias already taken'}), 409
        profile.alias        = alias
        profile.avatar_color = avatar_color
    else:
        # Create new
        existing = QuinielaProfile.query.filter_by(alias=alias).first()
        if existing:
            return jsonify({'error': 'alias already taken'}), 409
        profile = QuinielaProfile(
            user_id=user_id,
            alias=alias,
            avatar_color=avatar_color,
        )
        db.session.add(profile)
 
    try:
        db.session.commit()
        return jsonify({'profile': profile.to_dict()}), 200
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'alias already taken'}), 409
 
 
# ─────────────────────────────────────────────────────────────────────
# PREDICTIONS
# ─────────────────────────────────────────────────────────────────────
 
@quiniela_bp.route('/predictions', methods=['GET'])
@jwt_required()
def get_my_predictions():
    maybe_calculate_scores(current_app._get_current_object())
    user_id = int(get_jwt_identity())
    profile = _get_profile_or_404(user_id)
    if not profile:
        return jsonify({'error': 'quiniela profile required'}), 403
 
    preds = Prediction.query.filter_by(user_id=user_id).order_by(Prediction.match_date).all()
    return jsonify({'predictions': [p.to_dict() for p in preds]}), 200
 
 
@quiniela_bp.route('/predictions', methods=['POST'])
@jwt_required()
def upsert_prediction():
    """Create or update a prediction. Locked once match_date is reached."""
    user_id = int(get_jwt_identity())
    profile = _get_profile_or_404(user_id)
    if not profile:
        return jsonify({'error': 'Create a quiniela profile first'}), 403
 
    data = request.get_json(silent=True) or {}
 
    fixture_id = data.get('fixture_id')
    pred_home  = data.get('pred_home')
    pred_away  = data.get('pred_away')
 
    if fixture_id is None or pred_home is None or pred_away is None:
        return jsonify({'error': 'fixture_id, pred_home and pred_away are required'}), 400
 
    try:
        fixture_id = int(fixture_id)
        pred_home  = int(pred_home)
        pred_away  = int(pred_away)
    except (TypeError, ValueError):
        return jsonify({'error': 'fixture_id, pred_home and pred_away must be integers'}), 400
 
    if pred_home < 0 or pred_away < 0:
        return jsonify({'error': 'scores cannot be negative'}), 400
 
    # Optional match metadata for display
    team1      = data.get('team1', '')
    team2      = data.get('team2', '')
    flag1      = data.get('flag1', '')
    flag2      = data.get('flag2', '')
    group      = data.get('group', '')
    match_date = None
    if data.get('match_date'):
        try:
            match_date = datetime.fromisoformat(
                data['match_date'].replace('Z', '+00:00')
            ).replace(tzinfo=None)  # store as UTC naive
        except (ValueError, AttributeError):
            pass
 
    # Check if already locked
    existing = Prediction.query.filter_by(user_id=user_id, fixture_id=fixture_id).first()
    if existing and existing.is_locked:
        return jsonify({'error': 'Prediction is locked — match has already started'}), 403
 
    # Also validate against match_date from request
    if match_date and datetime.utcnow() >= match_date:
        return jsonify({'error': 'Prediction is locked — match has already started'}), 403
 
    if existing:
        existing.pred_home  = pred_home
        existing.pred_away  = pred_away
        existing.team1      = team1 or existing.team1
        existing.team2      = team2 or existing.team2
        existing.flag1      = flag1 or existing.flag1
        existing.flag2      = flag2 or existing.flag2
        existing.group      = group or existing.group
        if match_date:
            existing.match_date = match_date
        pred = existing
    else:
        pred = Prediction(
            user_id=user_id,
            fixture_id=fixture_id,
            pred_home=pred_home,
            pred_away=pred_away,
            team1=team1,
            team2=team2,
            flag1=flag1,
            flag2=flag2,
            group=group,
            match_date=match_date,
        )
        db.session.add(pred)
    if not existing:
            db.session.flush()
            profile.predictions_count = Prediction.query.filter_by(user_id=user_id).count()
 
    try:
        db.session.commit()
        return jsonify({'prediction': pred.to_dict()}), 200
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Database error'}), 500
 
 
@quiniela_bp.route('/predictions/<int:fixture_id>', methods=['DELETE'])
@jwt_required()
def delete_prediction(fixture_id):
    user_id = int(get_jwt_identity())
    pred = Prediction.query.filter_by(user_id=user_id, fixture_id=fixture_id).first()
    if not pred:
        return jsonify({'error': 'Prediction not found'}), 404
    if pred.is_locked:
        return jsonify({'error': 'Cannot delete a locked prediction'}), 403
    db.session.delete(pred)
    db.session.commit()
    return jsonify({'message': 'Prediction deleted'}), 200
 
 
# ─────────────────────────────────────────────────────────────────────
# LEADERBOARD GLOBAL
# ─────────────────────────────────────────────────────────────────────
 
@quiniela_bp.route('/leaderboard', methods=['GET'])
@jwt_required()
def global_leaderboard():
    maybe_calculate_scores(current_app._get_current_object())
    page     = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 50, type=int), 100)
 
    query = (
        QuinielaProfile.query
        .filter(QuinielaProfile.predictions_count > 0)
        .order_by(
            QuinielaProfile.total_points.desc(),
            QuinielaProfile.correct_scores.desc(),
            QuinielaProfile.correct_winners.desc(),
        )
    )
    total   = query.count()
    results = query.offset((page - 1) * per_page).limit(per_page).all()
 
    # Find current user's rank
    user_id    = int(get_jwt_identity())
    my_profile = _get_profile_or_404(user_id)
    my_rank    = None
    if my_profile and my_profile.predictions_count > 0:
        my_rank = (
            QuinielaProfile.query
            .filter(
                QuinielaProfile.predictions_count > 0,
                (QuinielaProfile.total_points > my_profile.total_points) |
                (
                    (QuinielaProfile.total_points == my_profile.total_points) &
                    (QuinielaProfile.correct_scores > my_profile.correct_scores)
                )
            )
            .count()
        ) + 1
 
    board = []
    for rank, p in enumerate(results, start=(page - 1) * per_page + 1):
        board.append({
            'rank':             rank,
            'alias':            p.alias,
            'avatar_color':     p.avatar_color,
            'total_points':     p.total_points,
            'correct_winners':  p.correct_winners,
            'correct_scores':   p.correct_scores,
            'predictions_count': p.predictions_count,
            'is_me':            p.user_id == user_id,
            'user_id':          p.user_id,
        })
 
    return jsonify({
        'leaderboard': board,
        'total':       total,
        'page':        page,
        'per_page':    per_page,
        'my_rank':     my_rank,
        'my_profile':  my_profile.to_dict() if my_profile else None,
    }), 200
 
 
# ─────────────────────────────────────────────────────────────────────
# PRIVATE LEAGUES
# ─────────────────────────────────────────────────────────────────────
 
@quiniela_bp.route('/leagues', methods=['GET'])
@jwt_required()
def my_leagues():
    user_id = int(get_jwt_identity())
    profile = _get_profile_or_404(user_id)
    if not profile:
        return jsonify({'error': 'quiniela profile required'}), 403
 
    memberships = LeagueMember.query.filter_by(user_id=user_id).all()
    league_ids  = [m.league_id for m in memberships]
    leagues     = PrivateLeague.query.filter(PrivateLeague.id.in_(league_ids)).all() if league_ids else []
 
    return jsonify({'leagues': [l.to_dict() for l in leagues]}), 200
 
 
@quiniela_bp.route('/leagues', methods=['POST'])
@jwt_required()
def create_league():
    user_id = int(get_jwt_identity())
    profile = _get_profile_or_404(user_id)
    if not profile:
        return jsonify({'error': 'Create a quiniela profile first'}), 403
 
    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'League name is required'}), 400
    if len(name) > 80:
        return jsonify({'error': 'League name too long (max 80 characters)'}), 400
 
    invite_code = PrivateLeague.generate_unique_code()
    league = PrivateLeague(name=name, invite_code=invite_code, owner_id=user_id)
    db.session.add(league)
    db.session.flush()  # get league.id before adding member
 
    # Owner is automatically a member
    member = LeagueMember(league_id=league.id, user_id=user_id)
    db.session.add(member)
 
    try:
        db.session.commit()
        return jsonify({'league': league.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error: {str(e)}'}), 500
 
 
@quiniela_bp.route('/leagues/join', methods=['POST'])
@jwt_required()
def join_league():
    user_id = int(get_jwt_identity())
    profile = _get_profile_or_404(user_id)
    if not profile:
        return jsonify({'error': 'Create a quiniela profile first'}), 403
 
    data        = request.get_json(silent=True) or {}
    invite_code = (data.get('invite_code') or '').strip().upper()
    if not invite_code:
        return jsonify({'error': 'invite_code is required'}), 400
 
    league = PrivateLeague.query.filter_by(invite_code=invite_code).first()
    if not league:
        return jsonify({'error': 'Invalid invite code'}), 404
 
    already = LeagueMember.query.filter_by(league_id=league.id, user_id=user_id).first()
    if already:
        return jsonify({'message': 'Already a member', 'league': league.to_dict()}), 200
 
    member = LeagueMember(league_id=league.id, user_id=user_id)
    db.session.add(member)
    try:
        db.session.commit()
        return jsonify({'message': 'Joined successfully', 'league': league.to_dict()}), 200
    except IntegrityError:
        db.session.rollback()
        return jsonify({'message': 'Already a member', 'league': league.to_dict()}), 200
 
 
@quiniela_bp.route('/leagues/<int:league_id>', methods=['GET'])
@jwt_required()
def league_leaderboard(league_id):
    maybe_calculate_scores(current_app._get_current_object())
    user_id = int(get_jwt_identity())
 
    league = PrivateLeague.query.get(league_id)
    if not league:
        return jsonify({'error': 'League not found'}), 404
 
    # Only members can see the leaderboard
    member = LeagueMember.query.filter_by(league_id=league_id, user_id=user_id).first()
    if not member:
        return jsonify({'error': 'You are not a member of this league'}), 403
 
    member_ids = [m.user_id for m in league.members]
    profiles   = (
        QuinielaProfile.query
        .filter(QuinielaProfile.user_id.in_(member_ids))
        .order_by(
            QuinielaProfile.total_points.desc(),
            QuinielaProfile.correct_scores.desc(),
            QuinielaProfile.correct_winners.desc(),
        )
        .all()
    )
 
    board = []
    for rank, p in enumerate(profiles, start=1):
        board.append({
            'rank':              rank,
            'user_id':           p.user_id,
            'alias':             p.alias,
            'avatar_color':      p.avatar_color,
            'total_points':      p.total_points,
            'correct_winners':   p.correct_winners,
            'correct_scores':    p.correct_scores,
            'predictions_count': p.predictions_count,
            'is_me':             p.user_id == user_id,
        })
 
    return jsonify({
        'league':      league.to_dict(),
        'leaderboard': board,
    }), 200
 
 
@quiniela_bp.route('/leagues/<int:league_id>', methods=['DELETE'])
@jwt_required()
def delete_league(league_id):
    user_id = int(get_jwt_identity())
    league  = PrivateLeague.query.get(league_id)
    if not league:
        return jsonify({'error': 'League not found'}), 404
    if league.owner_id != user_id:
        return jsonify({'error': 'Only the owner can delete this league'}), 403
 
    db.session.delete(league)
    db.session.commit()
    return jsonify({'message': 'League deleted'}), 200
 
 
@quiniela_bp.route('/leagues/<int:league_id>/leave', methods=['POST'])
@jwt_required()
def leave_league(league_id):
    user_id = int(get_jwt_identity())
    league  = PrivateLeague.query.get(league_id)
    if not league:
        return jsonify({'error': 'League not found'}), 404
    if league.owner_id == user_id:
        return jsonify({'error': 'Owner cannot leave — delete the league instead'}), 403
 
    member = LeagueMember.query.filter_by(league_id=league_id, user_id=user_id).first()
    if not member:
        return jsonify({'error': 'You are not a member'}), 404
 
    db.session.delete(member)
    db.session.commit()
    return jsonify({'message': 'Left the league'}), 200
 
 
@quiniela_bp.route('/leagues/<int:league_id>/member/<int:target_user_id>/predictions', methods=['GET'])
@jwt_required()
def get_member_predictions(league_id, target_user_id):
    """View another member's predictions — only within a private league."""
    user_id = int(get_jwt_identity())
 
    # Verify requester is a member
    league = PrivateLeague.query.get(league_id)
    if not league:
        return jsonify({'error': 'League not found'}), 404
 
    member = LeagueMember.query.filter_by(league_id=league_id, user_id=user_id).first()
    if not member:
        return jsonify({'error': 'You are not a member of this league'}), 403
 
    # Verify target is also a member
    target_member = LeagueMember.query.filter_by(league_id=league_id, user_id=target_user_id).first()
    if not target_member:
        return jsonify({'error': 'Target user is not a member of this league'}), 403
 
    profile = QuinielaProfile.query.filter_by(user_id=target_user_id).first()
    preds   = Prediction.query.filter_by(user_id=target_user_id).order_by(Prediction.match_date).all()
 
    # Only show predictions for locked matches (already started)
    visible = [p.to_dict() for p in preds if p.is_locked]
 
    return jsonify({
        'alias':       profile.alias if profile else '?',
        'predictions': visible,
    }), 200
 
 
@quiniela_bp.route('/champions', methods=['GET'])
def get_champions():
    """Public endpoint — returns champions per phase."""
    champions = QuinielaChampion.query.all()
    return jsonify({
        'champions': {c.phase: c.to_dict() for c in champions}
    }), 200

@quiniela_bp.route('/leagues/<int:league_id>/champions', methods=['GET'])
@jwt_required()
def league_champions(league_id):
    user_id = int(get_jwt_identity())

    league = PrivateLeague.query.get(league_id)
    if not league:
        return jsonify({'error': 'League not found'}), 404

    member = LeagueMember.query.filter_by(league_id=league_id, user_id=user_id).first()
    if not member:
        return jsonify({'error': 'You are not a member of this league'}), 403

    member_ids = [m.user_id for m in league.members]

    # Reuse global champions but filter by league members
    global_champs = QuinielaChampion.query.all()
    league_champs = {}

    for champ in global_champs:
        if champ.user_id not in member_ids:
            # Recalculate for this phase using only league members
            phase_champ = (
                QuinielaProfile.query
                .filter(QuinielaProfile.user_id.in_(member_ids))
                .order_by(
                    QuinielaProfile.total_points.desc(),
                    QuinielaProfile.correct_scores.desc(),
                )
                .first()
            )
            if phase_champ:
                league_champs[champ.phase] = {
                    'phase':        champ.phase,
                    'alias':        phase_champ.alias,
                    'avatar_color': phase_champ.avatar_color,
                    'points':       phase_champ.total_points,
                }
        else:
            league_champs[champ.phase] = champ.to_dict()

    return jsonify({'champions': league_champs}), 200


@quiniela_bp.route('/member/<int:target_user_id>/predictions', methods=['GET'])
@jwt_required()
def get_global_member_predictions(target_user_id):
    """View another user's locked predictions — available globally."""
    preds = (
        Prediction.query
        .filter_by(user_id=target_user_id)
        .order_by(Prediction.match_date.desc())
        .all()
    )
    return jsonify({'predictions': [p.to_dict() for p in preds]}), 200


# ── Admin: force score recalculation ───────────────────────────────────
@quiniela_bp.route('/admin/recalculate-scores', methods=['POST'])
def admin_recalculate_scores():
    """
    Manually re-run the score calculator job right now.
    Protected by a shared secret (header X-Admin-Secret) so it can be
    triggered from a browser/Postman without SSH access — useful when
    the scheduled job missed a finished match.

    Set ADMIN_SECRET in Railway env vars to enable this endpoint.
    """
    secret = os.getenv('ADMIN_SECRET', '')
    if not secret or request.headers.get('X-Admin-Secret') != secret:
        return jsonify({'error': 'Unauthorized'}), 401

    try:
        from jobs.score_calculator import calculate_scores
        print('[admin_recalculate] Starting score calculation...')
        calculate_scores(current_app._get_current_object())
        print('[admin_recalculate] Score calculation completed.')
    except Exception as e:
        print(f'[admin_recalculate] ERROR: {e}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

    return jsonify({'message': 'Score recalculation triggered'}), 200