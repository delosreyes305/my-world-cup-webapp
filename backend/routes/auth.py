import re
import secrets
from datetime import datetime, timedelta

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from flask_mail import Message

from extensions import db, bcrypt, mail
from models import User, PasswordResetToken

auth_bp = Blueprint('auth', __name__)
EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


# ── Validaciones ─────────────────────────────────────────────────────
def _validate_register(data):
    for field in ('first_name', 'last_name', 'email', 'password'):
        if not str(data.get(field, '')).strip():
            return f'{field} is required', 400
    if not EMAIL_RE.match(data['email']):
        return 'Invalid email address', 400
    if len(data['password']) < 6:
        return 'Password must be at least 6 characters', 400
    return None, None


# ── POST /api/auth/register ──────────────────────────────────────────
@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}

    error, status = _validate_register(data)
    if error:
        return jsonify({'error': error}), status

    email = data['email'].lower().strip()
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'This email is already registered'}), 409

    user = User(
        first_name    = data['first_name'].strip(),
        last_name     = data['last_name'].strip(),
        email         = email,
        password_hash = bcrypt.generate_password_hash(data['password']).decode('utf-8'),
    )
    db.session.add(user)
    db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    return jsonify({'access_token': access_token, 'user': user.to_dict()}), 201


# ── POST /api/auth/login ─────────────────────────────────────────────
@auth_bp.route('/login', methods=['POST'])
def login():
    data     = request.get_json(silent=True) or {}
    email    = str(data.get('email', '')).lower().strip()
    password = str(data.get('password', ''))

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Invalid email or password'}), 401

    access_token = create_access_token(identity=str(user.id))
    return jsonify({'access_token': access_token, 'user': user.to_dict()}), 200


# ── GET /api/auth/me ─────────────────────────────────────────────────
@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    return jsonify({'user': user.to_dict()}), 200


# ── POST /api/auth/forgot-password ───────────────────────────────────
@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data  = request.get_json(silent=True) or {}
    email = str(data.get('email', '')).lower().strip()

    if not email:
        return jsonify({'error': 'El email es requerido'}), 400

    # Siempre responder igual (no revelar si el email existe)
    SUCCESS_MSG = 'Si el email está registrado, recibirás el enlace en unos minutos.'

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'message': SUCCESS_MSG}), 200

    # Borrar tokens anteriores no usados
    PasswordResetToken.query.filter_by(user_id=user.id, used=False).delete()
    db.session.commit()

    # Crear token seguro con expiración de 1 hora
    token      = secrets.token_urlsafe(40)
    expires_at = datetime.utcnow() + timedelta(hours=1)

    reset_token = PasswordResetToken(user_id=user.id, token=token, expires_at=expires_at)
    db.session.add(reset_token)
    db.session.commit()

    frontend_url = current_app.config.get('FRONTEND_URL') or 'http://localhost:3000'
    reset_url    = f"{frontend_url}/reset-password?token={token}"

    # Enviar correo
    try:
        msg = Message(
            subject    = 'Recupera tu contraseña — My World Cup 2026',
            recipients = [user.email],
            html       = f"""
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#0a0e1a;color:#e2e8f0;margin:0;padding:40px 20px;">
  <div style="max-width:480px;margin:0 auto;background:#111827;border:1px solid rgba(240,180,41,0.2);border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#f0b429,#e8a020);padding:24px 28px;">
      <h1 style="margin:0;color:#0a0e1a;font-size:20px;font-weight:800;">⚽ My World Cup 2026</h1>
    </div>
    <div style="padding:32px 28px;">
      <h2 style="margin:0 0 12px;color:#f0b429;font-size:18px;">Recuperación de contraseña</h2>
      <p style="margin:0 0 8px;color:#94a3b8;">Hola <strong style="color:#e2e8f0;">{user.first_name}</strong>,</p>
      <p style="margin:0 0 24px;color:#94a3b8;line-height:1.6;">
        Recibimos una solicitud para restablecer la contraseña de tu cuenta.<br>
        Haz clic en el botón de abajo para crear una nueva contraseña.
      </p>
      <a href="{reset_url}"
         style="display:inline-block;background:linear-gradient(135deg,#f0b429,#e8a020);
                color:#0a0e1a;font-weight:700;font-size:15px;padding:14px 28px;
                border-radius:10px;text-decoration:none;">
        Cambiar contraseña
      </a>
      <p style="margin:24px 0 0;font-size:12px;color:#64748b;line-height:1.6;">
        Este enlace expira en <strong>1 hora</strong>.<br>
        Si no solicitaste este cambio, ignora este correo.
      </p>
    </div>
    <div style="padding:16px 28px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
      <p style="margin:0;font-size:11px;color:#475569;">
        My World Cup 2026 · No respondas a este correo
      </p>
    </div>
  </div>
</body>
</html>
            """,
        )
        mail.send(msg)
    except Exception as e:
        current_app.logger.error(f'Error enviando email de recuperación: {e}')
        return jsonify({'error': 'No se pudo enviar el correo. Verifica la configuración de email en el .env'}), 500

    return jsonify({'message': SUCCESS_MSG}), 200


# ── PATCH /api/auth/profile ──────────────────────────────────────────
@auth_bp.route('/profile', methods=['PATCH'])
@jwt_required()
def update_profile():
    user_id = int(get_jwt_identity())
    user    = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404

    data       = request.get_json(silent=True) or {}
    first_name = str(data.get('first_name', '')).strip()
    last_name  = str(data.get('last_name',  '')).strip()
    email      = str(data.get('email',      '')).lower().strip()

    if not first_name or not last_name or not email:
        return jsonify({'error': 'Nombre, apellido y email son requeridos'}), 400
    if not EMAIL_RE.match(email):
        return jsonify({'error': 'Email inválido'}), 400

    # Verificar que el email no lo use otro usuario
    existing = User.query.filter_by(email=email).first()
    if existing and existing.id != user.id:
        return jsonify({'error': 'Ese email ya está en uso'}), 409

    user.first_name = first_name
    user.last_name  = last_name
    user.email      = email
    db.session.commit()

    return jsonify({'message': 'Perfil actualizado', 'user': user.to_dict()}), 200


# ── PATCH /api/auth/password ──────────────────────────────────────────
@auth_bp.route('/password', methods=['PATCH'])
@jwt_required()
def change_password():
    user_id = int(get_jwt_identity())
    user    = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404

    data             = request.get_json(silent=True) or {}
    current_password = str(data.get('current_password', ''))
    new_password     = str(data.get('new_password',     ''))
    confirm          = str(data.get('confirm_password', ''))

    if not current_password or not new_password or not confirm:
        return jsonify({'error': 'Todos los campos son requeridos'}), 400
    if not bcrypt.check_password_hash(user.password_hash, current_password):
        return jsonify({'error': 'La contraseña actual es incorrecta'}), 401
    if len(new_password) < 6:
        return jsonify({'error': 'La nueva contraseña debe tener al menos 6 caracteres'}), 400
    if new_password != confirm:
        return jsonify({'error': 'Las contraseñas no coinciden'}), 400

    user.password_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
    db.session.commit()

    return jsonify({'message': 'Contraseña actualizada correctamente'}), 200


# ── POST /api/auth/reset-password ────────────────────────────────────
@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data         = request.get_json(silent=True) or {}
    token        = str(data.get('token', '')).strip()
    new_password = str(data.get('password', ''))

    if not token or not new_password:
        return jsonify({'error': 'Token y contraseña son requeridos'}), 400
    if len(new_password) < 6:
        return jsonify({'error': 'La contraseña debe tener al menos 6 caracteres'}), 400

    reset = PasswordResetToken.query.filter_by(token=token, used=False).first()

    if not reset:
        return jsonify({'error': 'Enlace inválido o ya utilizado'}), 400
    if datetime.utcnow() > reset.expires_at:
        db.session.delete(reset)
        db.session.commit()
        return jsonify({'error': 'El enlace ha expirado. Solicita uno nuevo.'}), 400

    user = User.query.get(reset.user_id)
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404

    user.password_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
    reset.used = True
    db.session.commit()

    return jsonify({'message': 'Contraseña actualizada. Ya puedes iniciar sesión.'}), 200


# ── DELETE /api/auth/account ─────────────────────────────────────────
@auth_bp.route('/account', methods=['DELETE'])
@jwt_required()
def delete_account():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    try:
        # Delete in order to avoid FK constraint errors
        from models import (Prediction, PredictionScore, QuinielaProfile,
                           LeagueMember, PrivateLeague, SentNotification,
                           NotificationPref, Favorite, PasswordResetToken)

        PredictionScore.query.filter_by(user_id=user_id).delete()
        Prediction.query.filter_by(user_id=user_id).delete()
        LeagueMember.query.filter_by(user_id=user_id).delete()
        PrivateLeague.query.filter_by(owner_id=user_id).delete()
        QuinielaProfile.query.filter_by(user_id=user_id).delete()
        SentNotification.query.filter_by(user_id=user_id).delete()
        NotificationPref.query.filter_by(user_id=user_id).delete()
        Favorite.query.filter_by(user_id=user_id).delete()
        PasswordResetToken.query.filter_by(user_id=user_id).delete()
        db.session.delete(user)
        db.session.commit()
        return jsonify({'message': 'Account deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error deleting account: {str(e)}'}), 500