from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.exc import IntegrityError
from extensions import db
from models import Favorite

favorites_bp = Blueprint('favorites', __name__)

VALID_TYPES = {'team', 'player', 'match', 'article'}


# ── GET /api/favorites ───────────────────────────────────────────────
@favorites_bp.route('', methods=['GET'])
@jwt_required()
def get_favorites():
    user_id = int(get_jwt_identity())
    favs    = Favorite.query.filter_by(user_id=user_id).order_by(Favorite.created_at).all()

    result = {'teams': [], 'players': [], 'matches': [], 'articles': []}
    for fav in favs:
        key = fav.type + 's'
        if key in result and fav.item_data:
            result[key].append(fav.item_data)

    return jsonify(result), 200


# ── POST /api/favorites ──────────────────────────────────────────────
@favorites_bp.route('', methods=['POST'])
@jwt_required()
def add_favorite():
    user_id = int(get_jwt_identity())
    data    = request.get_json(silent=True) or {}

    fav_type  = data.get('type', '')
    item_id   = data.get('item_id')
    item_data = data.get('item_data')

    if fav_type not in VALID_TYPES:
        return jsonify({'error': f'Invalid type: {fav_type}'}), 400
    if item_id is None or item_data is None:
        return jsonify({'error': 'item_id and item_data are required'}), 400

    try:
        item_id_int = int(item_id)
    except (TypeError, ValueError):
        return jsonify({'error': f'item_id must be an integer, got: {item_id}'}), 400

    fav = Favorite(
        user_id=user_id,
        type=fav_type,
        item_id=item_id_int,
        item_data=item_data,
    )
    try:
        db.session.add(fav)
        db.session.commit()
        return jsonify({'message': 'Added to favorites', 'favorite': fav.to_dict()}), 201
    except IntegrityError:
        db.session.rollback()
        return jsonify({'message': 'Already in favorites'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error: {str(e)}'}), 500


# ── DELETE /api/favorites/<type>/<item_id> ───────────────────────────
@favorites_bp.route('/<string:fav_type>/<int:item_id>', methods=['DELETE'])
@jwt_required()
def remove_favorite(fav_type, item_id):
    user_id = int(get_jwt_identity())

    try:
        fav = Favorite.query.filter_by(
            user_id=user_id, type=fav_type, item_id=item_id
        ).first()

        if not fav:
            return jsonify({'error': 'Favorite not found'}), 404

        db.session.delete(fav)
        db.session.commit()
        return jsonify({'message': 'Removed from favorites'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error: {str(e)}'}), 500
