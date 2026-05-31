from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import NotificationPref

notifications_bp = Blueprint('notifications', __name__)


# ── GET /api/notifications/prefs ─────────────────────────────────────
@notifications_bp.route('/prefs', methods=['GET'])
@jwt_required()
def get_prefs():
    user_id = int(get_jwt_identity())
    pref    = NotificationPref.query.filter_by(user_id=user_id).first()

    if not pref:
        # Devuelve defaults sin crear fila todavía
        return jsonify({
            'email_enabled':   False,
            'notify_match_1h': True,
            'notify_news':     True,
        }), 200

    return jsonify(pref.to_dict()), 200


# ── PATCH /api/notifications/prefs ───────────────────────────────────
@notifications_bp.route('/prefs', methods=['PATCH'])
@jwt_required()
def update_prefs():
    user_id = int(get_jwt_identity())
    data    = request.get_json(silent=True) or {}

    pref = NotificationPref.query.filter_by(user_id=user_id).first()
    if not pref:
        pref = NotificationPref(user_id=user_id)
        db.session.add(pref)

    if 'email_enabled'   in data: pref.email_enabled   = bool(data['email_enabled'])
    if 'notify_match_1h' in data: pref.notify_match_1h = bool(data['notify_match_1h'])
    if 'notify_news'     in data: pref.notify_news      = bool(data['notify_news'])

    db.session.commit()
    return jsonify({'message': 'Preferencias guardadas', 'prefs': pref.to_dict()}), 200
