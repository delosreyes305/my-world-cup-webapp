"""
Email notification templates for My World Cup 2026.
All styles are inline for maximum email client compatibility.
Bilingual: lang='es' | lang='en'
"""

# ── Color palette (matches the frontend) ─────────────────────────────
GOLD    = '#f0b429'
NAVY    = '#0a0e1a'
CARD    = '#111827'
TEXT    = '#f1f5f9'
TEXT2   = '#cbd5e1'
TEXT3   = '#64748b'
LOGO    = 'https://www.myfootballworldcup.com/assets/myc-logo-main-f3271236.png'
SITE    = 'https://www.myfootballworldcup.com'


def _base_wrapper(content: str, lang: str = 'es') -> str:
    """Wraps dynamic content in the premium base email layout."""
    if lang == 'es':
        footer_text = (
            f'Recibiste este correo porque activaste las notificaciones en tu cuenta de '
            f'<strong style="color:{GOLD};">My World Cup 2026</strong>.<br>'
            f'Puedes desactivarlas en cualquier momento desde '
            f'<strong style="color:{TEXT2};">Mi Cuenta &rsaquo; Notificaciones</strong>.'
        )
        unsubscribe = 'Administrar notificaciones'
    else:
        footer_text = (
            f'You received this email because you enabled notifications on your '
            f'<strong style="color:{GOLD};">My World Cup 2026</strong> account.<br>'
            f'You can turn them off anytime from '
            f'<strong style="color:{TEXT2};">My Account &rsaquo; Notifications</strong>.'
        )
        unsubscribe = 'Manage notifications'

    return f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My World Cup 2026</title>
</head>
<body style="margin:0;padding:0;background-color:{NAVY};font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:{NAVY};padding:40px 16px 48px;">
    <tr><td align="center">

      <!-- Card -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0"
             style="max-width:580px;background-color:{CARD};border-radius:20px;
                    border:1px solid rgba(240,180,41,0.18);overflow:hidden;">

        <!-- Header with logo -->
        <tr>
          <td style="background:linear-gradient(135deg,#0a1628 0%,#1a2d4a 60%,#0f2040 100%);
                     padding:24px 36px;border-bottom:1px solid rgba(240,180,41,0.15);">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td>
                  <a href="{SITE}" target="_blank" style="text-decoration:none;">
                    <img src="{LOGO}" alt="My World Cup 2026"
                         height="40" style="display:block;height:40px;width:auto;" />
                  </a>
                </td>
                <td align="right">
                  <span style="font-size:10px;letter-spacing:2px;color:{GOLD};
                                font-weight:700;text-transform:uppercase;">
                    
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Dynamic content -->
        {content}

        <!-- Footer -->
        <tr>
          <td style="padding:24px 36px 32px;border-top:1px solid rgba(255,255,255,0.06);">
            <p style="margin:0 0 10px;font-size:11px;color:{TEXT3};line-height:1.7;">
              {footer_text}
            </p>
            <a href="{SITE}" target="_blank"
               style="font-size:11px;color:{TEXT3};text-decoration:underline;">
              {unsubscribe}
            </a>
          </td>
        </tr>

      </table>

      <!-- Sub-footer -->
      <p style="margin:20px 0 0;font-size:11px;color:{TEXT3};text-align:center;">
        &copy; 2026 My World Cup &nbsp;&middot;&nbsp;
        <a href="{SITE}" style="color:{TEXT3};text-decoration:none;">
          myfootballworldcup.com
        </a>
      </p>

    </td></tr>
  </table>
</body>
</html>"""


# ─────────────────────────────────────────────────────────────────────
# MATCH 1-HOUR ALERT
# ─────────────────────────────────────────────────────────────────────

def match_1h_email(user_first_name: str, match: dict, lang: str = 'es') -> tuple[str, str]:
    """Returns (subject, html) for the 1-hour pre-match alert."""
    team1 = match.get('team1', '?')
    team2 = match.get('team2', '?')
    venue = match.get('venue') or match.get('stadium', '—')
    group = match.get('group', '')
    name  = user_first_name

    if lang == 'es':
        subject     = f'{team1} vs {team2} — empieza en 1 hora'
        greeting    = f'Hola {name},'
        headline    = 'Tu partido favorito esta por comenzar'
        sub_line    = 'Prepara todo. El juego empieza en menos de 60 minutos.'
        venue_label = 'Sede'
        group_label = 'Grupo'
        footer_msg  = 'No te pierdas ni un segundo.'
        cta_text    = 'Ver detalles del partido'
    else:
        subject     = f'{team1} vs {team2} — kicks off in 1 hour'
        greeting    = f'Hi {name},'
        headline    = 'Your favorite match is about to start'
        sub_line    = 'Get ready. Kick-off is in less than 60 minutes.'
        venue_label = 'Venue'
        group_label = 'Group'
        footer_msg  = "Don't miss a second."
        cta_text    = 'View match details'

    group_row = f"""
                    <tr>
                      <td style="padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                          <td style="font-size:12px;color:{TEXT3};">{group_label}</td>
                          <td align="right" style="font-size:12px;color:{TEXT};font-weight:600;">{group}</td>
                        </tr></table>
                      </td>
                    </tr>""" if group else ''

    content = f"""
        <!-- Greeting -->
        <tr>
          <td style="padding:32px 36px 0;">
            <p style="margin:0 0 4px;font-size:13px;color:{TEXT3};">{greeting}</p>
            <p style="margin:0 0 8px;font-size:22px;font-weight:800;color:{TEXT};line-height:1.25;">
              {headline}
            </p>
            <p style="margin:0;font-size:13px;color:{TEXT3};line-height:1.6;">{sub_line}</p>
          </td>
        </tr>

        <!-- Match card -->
        <tr>
          <td style="padding:24px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="background:linear-gradient(135deg,rgba(240,180,41,0.10) 0%,rgba(240,180,41,0.04) 100%);
                          border:1px solid rgba(240,180,41,0.25);border-radius:14px;">
              <tr>
                <td style="padding:28px 24px;text-align:center;">
                  <!-- Teams row -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0"
                         style="margin-bottom:20px;">
                    <tr>
                      <td align="center" width="40%">
                        <p style="margin:0;font-size:20px;font-weight:800;color:{TEXT};">
                          {team1}
                        </p>
                      </td>
                      <td align="center" width="20%">
                        <p style="margin:0;font-size:13px;font-weight:700;
                                   color:{GOLD};letter-spacing:3px;">VS</p>
                      </td>
                      <td align="center" width="40%">
                        <p style="margin:0;font-size:20px;font-weight:800;color:{TEXT};">
                          {team2}
                        </p>
                      </td>
                    </tr>
                  </table>
                  <!-- Divider -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0"
                         style="border-top:1px solid rgba(255,255,255,0.08);margin-bottom:16px;">
                    <tr><td></td></tr>
                  </table>
                  <!-- Meta table -->
                  <table cellpadding="0" cellspacing="0" border="0"
                         style="min-width:260px;margin:0 auto;text-align:left;">
                    {group_row}
                    <tr>
                      <td style="padding:5px 0;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                          <td style="font-size:12px;color:{TEXT3};">{venue_label}</td>
                          <td align="right" style="font-size:12px;color:{TEXT};font-weight:600;">{venue}</td>
                        </tr></table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 36px 32px;text-align:center;">
            <p style="margin:0 0 20px;font-size:13px;color:{TEXT3};">{footer_msg}</p>
            <a href="{SITE}" target="_blank"
               style="display:inline-block;background:{GOLD};color:#0a0e1a;
                      font-size:13px;font-weight:800;text-decoration:none;
                      padding:12px 32px;border-radius:8px;letter-spacing:0.5px;">
              {cta_text}
            </a>
          </td>
        </tr>"""

    return subject, _base_wrapper(content, lang)


# ─────────────────────────────────────────────────────────────────────
# DAILY NEWS DIGEST
# ─────────────────────────────────────────────────────────────────────

def news_digest_email(user_first_name: str, articles: list, lang: str = 'es') -> tuple[str, str]:
    """Returns (subject, html) for the daily favorites news digest."""
    name  = user_first_name
    count = len(articles)

    if lang == 'es':
        subject  = f'{count} noticia{"s" if count != 1 else ""} sobre tus favoritos hoy'
        greeting = f'Hola {name},'
        headline = 'Noticias de tus equipos y jugadores favoritos'
        sub_line = 'Esto es lo mas relevante del dia relacionado con tus favoritos.'
        read_more = 'Leer mas'
        label     = 'NOTICIAS DE HOY'
        cta_label = 'Ver todos los partidos'
    else:
        subject   = f'{count} new article{"s" if count != 1 else ""} about your favorites'
        greeting  = f'Hi {name},'
        headline  = 'News about your favorite teams and players'
        sub_line  = "Here's what's happening today with your favorites."
        read_more = 'Read more'
        label     = "TODAY'S NEWS"
        cta_label = 'View all matches'

    articles_html = ''
    for i, art in enumerate(articles[:5]):
        title       = art.get('title', '')
        description = (art.get('description') or art.get('excerpt', ''))
        url         = art.get('url', SITE)
        source      = art.get('source', '')
        image       = art.get('image', '')
        desc_short  = description[:180] + ('…' if len(description) > 180 else '')

        sep = 'border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;' if i > 0 else 'padding-top:0;'

        img_block = f"""
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="margin-bottom:14px;">
                <tr><td>
                  <img src="{image}" alt="" width="100%"
                       style="display:block;border-radius:10px;
                              max-height:200px;object-fit:cover;width:100%;" />
                </td></tr>
              </table>""" if image else ''

        desc_block = f"""
              <p style="margin:0 0 12px;font-size:13px;color:{TEXT3};line-height:1.6;">
                {desc_short}
              </p>""" if desc_short else ''

        articles_html += f"""
            <tr>
              <td style="padding:20px 36px 0;{sep}">
                {img_block}
                <p style="margin:0 0 5px;font-size:10px;font-weight:700;letter-spacing:1.5px;
                           color:{GOLD};text-transform:uppercase;">{source}</p>
                <p style="margin:0 0 8px;font-size:15px;font-weight:700;
                           color:{TEXT};line-height:1.4;">{title}</p>
                {desc_block}
                <a href="{url}" target="_blank"
                   style="font-size:12px;font-weight:700;color:{GOLD};
                          text-decoration:none;border-bottom:1px solid rgba(240,180,41,0.3);
                          padding-bottom:1px;">
                  {read_more} &rarr;
                </a>
              </td>
            </tr>"""

    content = f"""
        <!-- Greeting -->
        <tr>
          <td style="padding:32px 36px 20px;">
            <p style="margin:0 0 4px;font-size:13px;color:{TEXT3};">{greeting}</p>
            <p style="margin:0 0 8px;font-size:22px;font-weight:800;color:{TEXT};line-height:1.25;">
              {headline}
            </p>
            <p style="margin:0;font-size:13px;color:{TEXT3};line-height:1.6;">{sub_line}</p>
          </td>
        </tr>

        <!-- Section label -->
        <tr>
          <td style="padding:0 36px 4px;">
            <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:2px;
                       color:{TEXT3};text-transform:uppercase;
                       border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;">
              {label}
            </p>
          </td>
        </tr>

        {articles_html}

        <!-- CTA -->
        <tr>
          <td style="padding:32px 36px;text-align:center;">
            <a href="{SITE}" target="_blank"
               style="display:inline-block;background:{GOLD};color:#0a0e1a;
                      font-size:13px;font-weight:800;text-decoration:none;
                      padding:12px 32px;border-radius:8px;letter-spacing:0.5px;">
              {cta_label}
            </a>
          </td>
        </tr>"""

    return subject, _base_wrapper(content, lang)