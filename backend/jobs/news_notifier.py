"""
Job: check_news_favorites
Corre cada 3 horas.
- Obtiene últimas noticias de WC 2026 (1 sola llamada a TheNewsAPI).
- Para cada usuario con notify_news = True, filtra artículos que
  mencionen alguno de sus equipos/jugadores favoritos.
- Envía un digest con los artículos nuevos (que aún no se le enviaron).
"""

import os
import resend
import requests
from datetime import datetime, timezone, timedelta
from sqlalchemy.exc import IntegrityError

from extensions import db
from models import User, Favorite, NotificationPref, SentNotification
from jobs.email_templates import news_digest_email


NEWS_BASE = 'https://api.thenewsapi.com/v1'


def _fetch_wc_articles():
    """Fetch WC 2026 articles published in the last 24 hours only."""
    key = os.getenv('NEWS_API_KEY', '')
    if not key:
        print('⚠️  [news_notifier] NEWS_API_KEY not configured.')
        return []
    try:
        since = (datetime.now(timezone.utc) - timedelta(hours=24)).strftime('%Y-%m-%dT%H:%M:%S')
        resp = requests.get(
            f'{NEWS_BASE}/news/all',
            params={
                'api_token':       key,
                'search':          'World Cup 2026',
                'categories':      'sports',
                'language':        'en',
                'limit':           '20',
                'published_after': since,
            },
            timeout=10,
        )
        data = resp.json()
        return data.get('data', [])
    except Exception as exc:
        print(f'❌ [news_notifier] Error calling TheNewsAPI: {exc}')
        return []


def _already_sent_today(user_id: int) -> bool:
    """True if daily news digest was already sent to this user today."""
    today_key = f"digest_{datetime.now(timezone.utc).strftime('%Y-%m-%d')}"
    return SentNotification.query.filter_by(
        user_id=user_id,
        notif_type='news_daily',
        ref_key=today_key,
    ).first() is not None


def _mark_digest_sent(user_id: int):
    """Mark today's digest as sent for this user."""
    today_key = f"digest_{datetime.now(timezone.utc).strftime('%Y-%m-%d')}"
    try:
        db.session.add(SentNotification(
            user_id=user_id,
            notif_type='news_daily',
            ref_key=today_key,
        ))
        db.session.flush()
    except IntegrityError:
        db.session.rollback()


def _article_mentions(article: dict, keywords: list[str]) -> bool:
    """True si el artículo menciona alguna de las keywords en título o descripción."""
    text = (
        (article.get('title') or '') + ' ' +
        (article.get('description') or '') + ' ' +
        (article.get('snippet') or '')
    ).lower()
    return any(kw.lower() in text for kw in keywords if kw)


def check_news_favorites(app):
    with app.app_context():
        resend.api_key = os.getenv('RESEND_API_KEY', '')
        if not resend.api_key:
            print('⚠️  [news_notifier] RESEND_API_KEY no configurada, saltando.')
            return

        # Usuarios con notificaciones de noticias habilitadas
        prefs = NotificationPref.query.filter_by(
            email_enabled=True,
            notify_news=True,
        ).all()

        if not prefs:
            return

        # Una sola llamada a la API para todos los usuarios
        articles = _fetch_wc_articles()
        if not articles:
            print('🔍 [news_notifier] Sin artículos nuevos de la API.')
            return

        sent_count = 0

        for pref in prefs:
            user = User.query.get(pref.user_id)
            if not user:
                continue

            # Skip if digest already sent today
            if _already_sent_today(user.id):
                continue

            # Collect keywords: teams, players AND match teams from favorites
            favs = Favorite.query.filter_by(user_id=user.id).all()
            keywords = []
            for fav in favs:
                data = fav.item_data or {}
                if fav.type in ('team', 'player'):
                    name = data.get('name', '')
                    if name:
                        keywords.append(name)
                        parts = name.split()
                        if len(parts) > 1:
                            keywords.append(parts[0])
                elif fav.type == 'match':
                    # Include both team names from the match
                    for key in ('team1', 'team2'):
                        tname = data.get(key, '')
                        if tname:
                            keywords.append(tname)
                            parts = tname.split()
                            if len(parts) > 1:
                                keywords.append(parts[0])

            if not keywords:
                continue

            # Filter articles mentioning favorites
            relevant = [a for a in articles if _article_mentions(a, keywords)]
            if not relevant:
                continue

            # Build digest (up to 5 articles)
            articles_payload = []
            for art in relevant[:5]:
                articles_payload.append({
                    'title':       art.get('title', ''),
                    'description': art.get('description') or art.get('snippet', ''),
                    'url':         art.get('url', '#'),
                    'source':      art.get('source', ''),
                    'image':       art.get('image_url') or art.get('image', ''),
                })

            subject, html = news_digest_email(user.first_name, articles_payload, lang='es')

            try:
                resend.Emails.send({
                    'from':    'My World Cup 2026 <noreply@myfootballworldcup.com>',
                    'to':      [user.email],
                    'subject': subject,
                    'html':    html,
                })

                # Mark digest as sent for today
                _mark_digest_sent(user.id)
                db.session.commit()
                sent_count += 1
                print(f'✅ [news_notifier] Digest enviado a {user.email} '
                      f'({len(articles_payload)} artículo(s))')

            except Exception as exc:
                db.session.rollback()
                print(f'❌ [news_notifier] Error enviando a {user.email}: {exc}')

        if sent_count:
            print(f'📧 [news_notifier] {sent_count} digest(s) enviados.')
        else:
            print('🔍 [news_notifier] Sin noticias nuevas para notificar.')