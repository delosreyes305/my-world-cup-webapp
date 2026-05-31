"""
Job: check_upcoming_matches
Corre cada 15 minutos.
Busca partidos favoritos que empiecen en los próximos 45-75 min
y envía un email a los usuarios que tengan notify_match_1h = True.
"""

import os
import resend
from datetime import datetime, timezone, timedelta
from sqlalchemy.exc import IntegrityError

from extensions import db
from models import User, Favorite, NotificationPref, SentNotification
from jobs.email_templates import match_1h_email


def check_upcoming_matches(app):
    with app.app_context():
        now          = datetime.now(timezone.utc)
        window_start = now + timedelta(minutes=45)
        window_end   = now + timedelta(minutes=75)

        resend.api_key = os.getenv('RESEND_API_KEY', '')
        if not resend.api_key:
            print('⚠️  [match_notifier] RESEND_API_KEY no configurada, saltando.')
            return

        # Usuarios con notificaciones de partidos habilitadas
        prefs = NotificationPref.query.filter_by(
            email_enabled=True,
            notify_match_1h=True,
        ).all()

        if not prefs:
            return

        sent_count = 0

        for pref in prefs:
            user = User.query.get(pref.user_id)
            if not user:
                continue

            # Partidos favoritos del usuario
            fav_matches = Favorite.query.filter_by(
                user_id=user.id,
                type='match',
            ).all()

            for fav in fav_matches:
                match_data = fav.item_data or {}
                date_str   = match_data.get('date')
                if not date_str:
                    continue

                # Parsear fecha (acepta 'Z' y '+00:00')
                try:
                    match_dt = datetime.fromisoformat(
                        date_str.replace('Z', '+00:00')
                    )
                except ValueError:
                    continue

                # ¿Está dentro de la ventana 45-75 min?
                if not (window_start <= match_dt <= window_end):
                    continue

                # ¿Ya se envió esta notificación?
                ref_key = f"match_{fav.item_id}_{match_dt.strftime('%Y%m%d')}"
                if SentNotification.query.filter_by(
                    user_id=user.id,
                    notif_type='match_1h',
                    ref_key=ref_key,
                ).first():
                    continue

                # Determinar idioma (por defecto español)
                lang = 'es'

                # Generar y enviar email
                subject, html = match_1h_email(user.first_name, match_data, lang)
                try:
                    resend.Emails.send({
                        'from':    'My World Cup 2026 <onboarding@resend.dev>',
                        'to':      [user.email],
                        'subject': subject,
                        'html':    html,
                    })

                    # Registrar como enviado
                    db.session.add(SentNotification(
                        user_id=user.id,
                        notif_type='match_1h',
                        ref_key=ref_key,
                    ))
                    db.session.commit()
                    sent_count += 1
                    print(f'✅ [match_notifier] Email enviado a {user.email} — {ref_key}')

                except IntegrityError:
                    db.session.rollback()
                except Exception as exc:
                    db.session.rollback()
                    print(f'❌ [match_notifier] Error enviando a {user.email}: {exc}')

        if sent_count:
            print(f'📧 [match_notifier] {sent_count} email(s) enviados.')
        else:
            print('🔍 [match_notifier] Sin partidos próximos para notificar.')
