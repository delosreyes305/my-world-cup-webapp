"""
Champion Calculator Job
Runs every 15 minutes alongside score_calculator.
Determines the champion for each phase once all matches in that phase are finished.

Phases:
  group_stage  → all fixtures with 'Group Stage' in the round field
  knockout     → all other fixtures (Round of 32, QF, SF, Final)
  overall      → champion across all fixtures (calculated after final)

Point tracking uses PredictionScore entries per user, filtered by phase.
"""
import os
import requests
from datetime import datetime

from models import (
    Prediction, PredictionScore, QuinielaProfile,
    QuinielaChampion,
)
from extensions import db

API_BASE  = 'https://v3.football.api-sports.io'
WC_LEAGUE = 1
WC_SEASON = 2026
FINISHED  = {'FT', 'AET', 'PEN'}

GROUP_KEYWORDS    = ['group stage', 'group']
KNOCKOUT_KEYWORDS = ['round of 32', 'round of 16', 'quarter', 'semi', 'final']


def _is_group_fixture(round_str: str) -> bool:
    if not round_str:
        return False
    r = round_str.lower()
    return any(k in r for k in GROUP_KEYWORDS)


def _fetch_all_fixtures() -> list:
    api_key = os.getenv('FOOTBALL_API_KEY', '')
    if not api_key or api_key == 'TU_CLAVE_AQUI':
        return []
    try:
        resp = requests.get(
            f'{API_BASE}/fixtures',
            params={'league': WC_LEAGUE, 'season': WC_SEASON},
            headers={'x-apisports-key': api_key},
            timeout=15,
        )
        return resp.json().get('response', [])
    except Exception as exc:
        print(f'[champion_calculator] Error fetching fixtures: {exc}')
        return []


def _all_finished(fixtures: list) -> bool:
    return all(
        f.get('fixture', {}).get('status', {}).get('short', '') in FINISHED
        for f in fixtures
    )


def _award_champion(app, phase: str, fixture_ids: set):
    """Calculate and store the champion for a given phase."""
    with app.app_context():
        # Already awarded?
        if QuinielaChampion.query.filter_by(phase=phase).first():
            return

        # Sum points per user for this phase's fixtures
        scores = (
            db.session.query(
                PredictionScore.user_id,
                db.func.sum(PredictionScore.points).label('total'),
            )
            .filter(PredictionScore.fixture_id.in_(fixture_ids))
            .group_by(PredictionScore.user_id)
            .order_by(db.func.sum(PredictionScore.points).desc())
            .first()
        )

        if not scores:
            return

        winner_user_id, winner_points = scores.user_id, scores.total
        profile = QuinielaProfile.query.filter_by(user_id=winner_user_id).first()
        if not profile:
            return

        champion = QuinielaChampion(
            phase=phase,
            user_id=winner_user_id,
            alias=profile.alias,
            avatar_color=profile.avatar_color,
            points=winner_points,
        )
        db.session.add(champion)
        db.session.commit()
        print(f'[champion_calculator] {phase} champion: {profile.alias} ({winner_points} pts)')


def calculate_champions(app):
    """Main job — called every 15 minutes."""
    with app.app_context():
        # Check if already have all 3 champions
        existing = {c.phase for c in QuinielaChampion.query.all()}
        if {'group_stage', 'knockout', 'overall'}.issubset(existing):
            return  # all done

    all_fixtures = _fetch_all_fixtures()
    if not all_fixtures:
        return

    group_fixtures    = [f for f in all_fixtures if _is_group_fixture(f.get('league', {}).get('round', ''))]
    knockout_fixtures = [f for f in all_fixtures if not _is_group_fixture(f.get('league', {}).get('round', ''))]

    group_ids    = {f['fixture']['id'] for f in group_fixtures}
    knockout_ids = {f['fixture']['id'] for f in knockout_fixtures}
    all_ids      = group_ids | knockout_ids

    # Group stage champion
    if 'group_stage' not in existing and _all_finished(group_fixtures):
        _award_champion(app, 'group_stage', group_ids)

    # Knockout champion
    if 'knockout' not in existing and _all_finished(knockout_fixtures):
        _award_champion(app, 'knockout', knockout_ids)

    # Overall champion — only after everything is done
    if 'overall' not in existing and _all_finished(all_fixtures):
        _award_champion(app, 'overall', all_ids)