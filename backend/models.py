from extensions import db
from datetime import datetime


class User(db.Model):
    __tablename__ = 'users'

    id            = db.Column(db.Integer, primary_key=True)
    first_name    = db.Column(db.String(100), nullable=False)
    last_name     = db.Column(db.String(100), nullable=False)
    email         = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)

    favorites      = db.relationship('Favorite',           backref='user', lazy=True, cascade='all, delete-orphan')
    reset_tokens   = db.relationship('PasswordResetToken', backref='user', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id':         self.id,
            'first_name': self.first_name,
            'last_name':  self.last_name,
            'email':      self.email,
            'created_at': self.created_at.isoformat(),
        }


class Favorite(db.Model):
    __tablename__ = 'favorites'

    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    type       = db.Column(db.String(20), nullable=False)   # 'team' | 'player' | 'match'
    item_id    = db.Column(db.Integer, nullable=False)
    item_data  = db.Column(db.JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'type', 'item_id', name='uq_user_favorite'),
    )

    def to_dict(self):
        return {
            'id':         self.id,
            'type':       self.type,
            'item_id':    self.item_id,
            'item_data':  self.item_data,
            'created_at': self.created_at.isoformat(),
        }


class NotificationPref(db.Model):
    """Preferencias de notificación por email del usuario (1 fila por usuario)."""
    __tablename__ = 'notification_prefs'

    id              = db.Column(db.Integer, primary_key=True)
    user_id         = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False, index=True)
    email_enabled   = db.Column(db.Boolean, default=False, nullable=False)
    notify_match_1h = db.Column(db.Boolean, default=True,  nullable=False)
    notify_news     = db.Column(db.Boolean, default=True,  nullable=False)
    updated_at      = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'email_enabled':   self.email_enabled,
            'notify_match_1h': self.notify_match_1h,
            'notify_news':     self.notify_news,
        }


class SentNotification(db.Model):
    """Registro de notificaciones ya enviadas (evita duplicados)."""
    __tablename__ = 'sent_notifications'

    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    notif_type = db.Column(db.String(20),  nullable=False)   # 'match_1h' | 'news'
    ref_key    = db.Column(db.String(255), nullable=False)   # match_id o URL del artículo
    sent_at    = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'notif_type', 'ref_key', name='uq_sent_notif'),
    )


class PasswordResetToken(db.Model):
    __tablename__ = 'password_reset_tokens'

    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    token      = db.Column(db.String(120), unique=True, nullable=False, index=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    used       = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
