"""
Templates HTML para los correos de notificación de My World Cup 2026.
Todos usan estilos inline para máxima compatibilidad con clientes de email.
"""

# Paleta (replica la del front)
GOLD   = '#f0b429'
NAVY   = '#0a0e1a'
CARD   = '#111827'
TEXT   = '#f1f5f9'
TEXT3  = '#64748b'
BORDER = 'rgba(255,255,255,0.08)'


def _base_wrapper(content: str) -> str:
    """Envuelve el contenido en el layout base del email."""
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My World Cup 2026</title>
</head>
<body style="margin:0;padding:0;background:{NAVY};font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"
         style="background:{NAVY};padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0"
             style="max-width:560px;background:{CARD};border-radius:16px;
                    border:1px solid rgba(240,180,41,0.15);overflow:hidden;">

        <!-- Logo / header -->
        <tr>
          <td style="padding:28px 32px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
            <p style="margin:0;font-size:11px;letter-spacing:3px;
                      color:{GOLD};font-weight:700;text-transform:uppercase;">
              ⚽&nbsp; MY WORLD CUP 2026
            </p>
          </td>
        </tr>

        <!-- Contenido dinámico -->
        {content}

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px 28px;border-top:1px solid rgba(255,255,255,0.06);">
            <p style="margin:0;font-size:11px;color:{TEXT3};line-height:1.6;">
              Recibiste este correo porque activaste las notificaciones en tu cuenta de
              <strong style="color:{GOLD};">My World Cup 2026</strong>.<br>
              Puedes desactivarlas en cualquier momento desde
              <strong>Mi Cuenta → Notificaciones</strong>.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


def match_1h_email(user_first_name: str, match: dict, lang: str = 'es') -> tuple[str, str]:
    """
    Genera (subject, html) para la notificación de partido a 1 hora.
    match = item_data del favorito (tiene team1, team2, venue, date, group, etc.)
    """
    team1  = match.get('team1', '?')
    team2  = match.get('team2', '?')
    venue  = match.get('venue') or match.get('stadium', '—')
    group  = match.get('group', '')
    name   = user_first_name

    if lang == 'es':
        subject = f'⚽ {team1} vs {team2} — ¡empieza en 1 hora!'
        greeting    = f'Hola {name},'
        headline    = '¡Tu partido favorito está por comenzar!'
        venue_label = '📍 Sede'
        group_label = '🏆 Grupo'
        cta_text    = 'Ver detalles del partido'
        footer_msg  = 'No te pierdas ni un segundo.'
    else:
        subject = f'⚽ {team1} vs {team2} — Kicks off in 1 hour!'
        greeting    = f'Hi {name},'
        headline    = 'Your favorite match is about to start!'
        venue_label = '📍 Venue'
        group_label = '🏆 Group'
        cta_text    = 'View match details'
        footer_msg  = "Don't miss a second."

    group_row = f"""
        <tr>
          <td style="padding:4px 0;">
            <span style="color:{TEXT3};font-size:13px;">{group_label}:&nbsp;</span>
            <span style="color:{TEXT};font-size:13px;font-weight:600;">{group}</span>
          </td>
        </tr>""" if group else ''

    content = f"""
        <!-- Greeting -->
        <tr>
          <td style="padding:28px 32px 0;">
            <p style="margin:0 0 6px;font-size:14px;color:{TEXT3};">{greeting}</p>
            <p style="margin:0;font-size:16px;font-weight:700;color:{TEXT};">{headline}</p>
          </td>
        </tr>

        <!-- Match card -->
        <tr>
          <td style="padding:20px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:rgba(240,180,41,0.07);border:1px solid rgba(240,180,41,0.2);
                          border-radius:12px;padding:24px;text-align:center;">
              <tr>
                <td>
                  <!-- Teams -->
                  <p style="margin:0 0 4px;font-size:24px;font-weight:800;
                             color:{GOLD};letter-spacing:1px;">
                    {team1}
                  </p>
                  <p style="margin:0 0 4px;font-size:13px;color:{TEXT3};letter-spacing:2px;">VS</p>
                  <p style="margin:0 0 20px;font-size:24px;font-weight:800;
                             color:{GOLD};letter-spacing:1px;">
                    {team2}
                  </p>

                  <!-- Meta info -->
                  <table cellpadding="0" cellspacing="0" style="margin:0 auto;text-align:left;">
                    {group_row}
                    <tr>
                      <td style="padding:4px 0;">
                        <span style="color:{TEXT3};font-size:13px;">{venue_label}:&nbsp;</span>
                        <span style="color:{TEXT};font-size:13px;font-weight:600;">{venue}</span>
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
          <td style="padding:0 32px 28px;text-align:center;">
            <p style="margin:0 0 20px;font-size:13px;color:{TEXT3};">{footer_msg}</p>
          </td>
        </tr>"""

    return subject, _base_wrapper(content)


def news_digest_email(user_first_name: str, articles: list, lang: str = 'es') -> tuple[str, str]:
    """
    Genera (subject, html) para el digest de noticias de favoritos.
    articles = lista de dicts con title, description, url, source
    """
    name  = user_first_name
    count = len(articles)

    if lang == 'es':
        subject     = f'📰 {count} noticia{"s" if count != 1 else ""} sobre tus favoritos'
        greeting    = f'Hola {name},'
        headline    = 'Noticias relacionadas con tus equipos y jugadores favoritos'
        read_more   = 'Leer más →'
    else:
        subject     = f'📰 {count} new article{"s" if count != 1 else ""} about your favorites'
        greeting    = f'Hi {name},'
        headline    = 'News related to your favorite teams and players'
        read_more   = 'Read more →'

    articles_html = ''
    for art in articles[:5]:  # máximo 5 artículos por email
        title       = art.get('title', '')
        description = art.get('description') or art.get('excerpt', '')
        url         = art.get('url', '#')
        source      = art.get('source', '')
        image       = art.get('image', '')

        img_row = f"""
                  <tr>
                    <td style="padding:0 0 12px;">
                      <img src="{image}" alt="" width="100%"
                           style="border-radius:8px;display:block;max-height:180px;
                                  object-fit:cover;width:100%;" />
                    </td>
                  </tr>""" if image else ''

        desc_row = f"""
                  <tr>
                    <td style="padding:0 0 10px;">
                      <p style="margin:0;font-size:13px;color:{TEXT3};line-height:1.55;">
                        {description[:160]}{'…' if len(description) > 160 else ''}
                      </p>
                    </td>
                  </tr>""" if description else ''

        articles_html += f"""
            <tr>
              <td style="padding:0 32px 20px;">
                <table width="100%" cellpadding="0" cellspacing="0"
                       style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);
                              border-radius:10px;padding:16px;overflow:hidden;">
                  <tr>
                    <td>
                      <table width="100%" cellpadding="0" cellspacing="0">
                        {img_row}
                        <tr>
                          <td style="padding:0 0 6px;">
                            <p style="margin:0;font-size:14px;font-weight:700;
                                       color:{TEXT};line-height:1.4;">
                              {title}
                            </p>
                          </td>
                        </tr>
                        {desc_row}
                        <tr>
                          <td>
                            <table cellpadding="0" cellspacing="0" width="100%">
                              <tr>
                                <td>
                                  <span style="font-size:11px;color:{TEXT3};">{source}</span>
                                </td>
                                <td align="right">
                                  <a href="{url}" target="_blank"
                                     style="font-size:12px;color:{GOLD};
                                            font-weight:700;text-decoration:none;">
                                    {read_more}
                                  </a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>"""

    content = f"""
        <!-- Greeting -->
        <tr>
          <td style="padding:28px 32px 20px;">
            <p style="margin:0 0 6px;font-size:14px;color:{TEXT3};">{greeting}</p>
            <p style="margin:0;font-size:16px;font-weight:700;color:{TEXT};">{headline}</p>
          </td>
        </tr>
        {articles_html}"""

    return subject, _base_wrapper(content)
