from extensions import db
from datetime import datetime
import secrets
import string


class User(db.Model):
    __tablename__ = 'users'

    id            = db.Column(db.Integer, primary_key=True)
    first_name    = db.Column(db.String(100), nullable=False)
    last_name     = db.Column(db.String(100), nullable=False)
    email         = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)

    favorites        = db.relationship('Favorite',           backref='user', lazy=True, cascade='all, delete-orphan')
    reset_tokens     = db.relationship('PasswordResetToken', backref='user', lazy=True, cascade='all, delete-orphan')
    quiniela_profile = db.relationship('QuinielaProfile',    backref='user', lazy=True, uselist=False, cascade='all, delete-orphan')
    predictions      = db.relationship('Prediction',         backref='user', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id':         self.id,
            'first_name': self.first_name,
            'last_name':  self.last_name,
            'email':      self.email,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Favorite(db.Model):
    __tablename__ = 'favorites'

    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    type       = db.Column(db.String(20), nullable=False)
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
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class NotificationPref(db.Model):
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
    __tablename__ = 'sent_notifications'

    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    notif_type = db.Column(db.String(20),  nullable=False)
    ref_key    = db.Column(db.String(255), nullable=False)
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


# ─────────────────────────────────────────────────────────────────────
# QUINIELA MODELS
# ─────────────────────────────────────────────────────────────────────

class QuinielaProfile(db.Model):
    """Public alias for the quiniela — decoupled from User's real name/email."""
    __tablename__ = 'quiniela_profiles'

    id            = db.Column(db.Integer, primary_key=True)
    user_id       = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False, index=True)
    alias         = db.Column(db.String(30), unique=True, nullable=False, index=True)
    avatar_color  = db.Column(db.String(7), default='#f0b429', nullable=False)  # hex color
    total_points  = db.Column(db.Integer, default=0, nullable=False)
    correct_winners = db.Column(db.Integer, default=0, nullable=False)
    correct_scores  = db.Column(db.Integer, default=0, nullable=False)
    predictions_count = db.Column(db.Integer, default=0, nullable=False)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at    = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'alias':              self.alias,
            'avatar_color':       self.avatar_color,
            'total_points':       self.total_points,
            'correct_winners':    self.correct_winners,
            'correct_scores':     self.correct_scores,
            'predictions_count':  self.predictions_count,
            'created_at':         self.created_at.isoformat() if self.created_at else None,
        }


class Prediction(db.Model):
    """A single user prediction for a fixture."""
    __tablename__ = 'predictions'

    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    fixture_id = db.Column(db.Integer, nullable=False, index=True)
    # Predicted score
    pred_home  = db.Column(db.Integer, nullable=False)   # goals predicted for home team
    pred_away  = db.Column(db.Integer, nullable=False)   # goals predicted for away team
    # Snapshot of fixture data (for display without extra API calls)
    team1      = db.Column(db.String(100), nullable=False)
    team2      = db.Column(db.String(100), nullable=False)
    flag1      = db.Column(db.String(255), nullable=True)
    flag2      = db.Column(db.String(255), nullable=True)
    match_date = db.Column(db.DateTime, nullable=True)   # kickoff UTC — used to lock prediction
    group      = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    score      = db.relationship('PredictionScore', backref='prediction', lazy=True, uselist=False, cascade='all, delete-orphan')

    __table_args__ = (
        db.UniqueConstraint('user_id', 'fixture_id', name='uq_user_fixture'),
    )

    @property
    def is_locked(self):
        """Returns True if the match has already started."""
        if not self.match_date:
            return False
        return datetime.utcnow() >= self.match_date

    def to_dict(self, include_score=True):
        d = {
            'id':          self.id,
            'fixture_id':  self.fixture_id,
            'pred_home':   self.pred_home,
            'pred_away':   self.pred_away,
            'team1':       self.team1,
            'team2':       self.team2,
            'flag1':       self.flag1,
            'flag2':       self.flag2,
            'match_date':  self.match_date.isoformat() if self.match_date else None,
            'group':       self.group,
            'is_locked':   self.is_locked,
            'created_at':  self.created_at.isoformat() if self.created_at else None,
            'updated_at':  self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_score and self.score:
            d['score'] = self.score.to_dict()
        return d


class PredictionScore(db.Model):
    """Points awarded after a fixture finishes."""
    __tablename__ = 'prediction_scores'

    id              = db.Column(db.Integer, primary_key=True)
    prediction_id   = db.Column(db.Integer, db.ForeignKey('predictions.id'), unique=True, nullable=False, index=True)
    user_id         = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    fixture_id      = db.Column(db.Integer, nullable=False, index=True)
    points          = db.Column(db.Integer, default=0, nullable=False)
    correct_winner  = db.Column(db.Boolean, default=False, nullable=False)
    correct_score   = db.Column(db.Boolean, default=False, nullable=False)
    # Actual result snapshot
    actual_home     = db.Column(db.Integer, nullable=True)
    actual_away     = db.Column(db.Integer, nullable=True)
    calculated_at   = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'points':         self.points,
            'correct_winner': self.correct_winner,
            'correct_score':  self.correct_score,
            'actual_home':    self.actual_home,
            'actual_away':    self.actual_away,
        }


def _generate_invite_code(length=8):
    """Generates a unique random invite code (uppercase letters + digits)."""
    chars = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(length))


class PrivateLeague(db.Model):
    """A private prediction league shared via invite code."""
    __tablename__ = 'private_leagues'

    id          = db.Column(db.Integer, primary_key=True)
    name        = db.Column(db.String(80), nullable=False)
    invite_code = db.Column(db.String(10), unique=True, nullable=False, index=True)
    owner_id    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    members     = db.relationship('LeagueMember', backref='league', lazy=True, cascade='all, delete-orphan')

    @staticmethod
    def generate_unique_code():
        for _ in range(10):
            code = _generate_invite_code()
            if not PrivateLeague.query.filter_by(invite_code=code).first():
                return code
        raise RuntimeError('Could not generate a unique invite code after 10 attempts')

    def to_dict(self, include_member_count=True):
        d = {
            'id':          self.id,
            'name':        self.name,
            'invite_code': self.invite_code,
            'owner_id':    self.owner_id,
            'created_at':  self.created_at.isoformat() if self.created_at else None,
        }
        if include_member_count:
            d['member_count'] = len(self.members)
        return d


class QuinielaChampion(db.Model):
    """Stores the champion for each phase of the tournament.
    phase: 'group_stage' | 'knockout' | 'overall'
    Populated automatically when the last match of each phase finishes.
    """
    __tablename__ = 'quiniela_champions'

    id          = db.Column(db.Integer, primary_key=True)
    phase       = db.Column(db.String(20), unique=True, nullable=False)  # group_stage | knockout | overall
    user_id     = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    alias       = db.Column(db.String(30), nullable=False)
    avatar_color = db.Column(db.String(7), nullable=False)
    points      = db.Column(db.Integer, nullable=False)
    awarded_at  = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'phase':        self.phase,
            'alias':        self.alias,
            'avatar_color': self.avatar_color,
            'points':       self.points,
            'awarded_at':   self.awarded_at.isoformat() if self.awarded_at else None,
        }


class LeagueMember(db.Model):
    """Membership of a user in a private league."""
    __tablename__ = 'league_members'

    id         = db.Column(db.Integer, primary_key=True)
    league_id  = db.Column(db.Integer, db.ForeignKey('private_leagues.id'), nullable=False, index=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    joined_at  = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('league_id', 'user_id', name='uq_league_member'),
    )