import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { useLang } from '../context/LangContext'
import { TEAM_ISO } from '../services/sportsService'
import './AccountPage.css'

// ── Formatea fecha ISO → "Mayo 2026" ────────────────────────────────
function formatDate(iso, lang) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
      month: 'long', year: 'numeric',
    })
  } catch { return '—' }
}

// ── Flag de equipo ───────────────────────────────────────────────────
function TeamFlag({ name }) {
  const iso = TEAM_ISO[name]
  if (!iso) return <div className="account-fav-emoji"><i className="fa-solid fa-shield-halved" /></div>
  return (
    <img
      src={`https://flagcdn.com/w40/${iso}.png`}
      alt={name}
      className="account-fav-flag"
      onError={e => { e.target.style.display = 'none' }}
    />
  )
}

// ── Toggle switch ────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`notif-toggle${checked ? ' notif-toggle--on' : ''}`}
    >
      <span className="notif-toggle-thumb" />
    </button>
  )
}

// ── Campo de texto con label ─────────────────────────────────────────
function Field({ label, type = 'text', value, onChange, placeholder, autoComplete, hint }) {
  const [show, setShow] = useState(false)
  const isPass = type === 'password'
  return (
    <div className="edit-field">
      <label className="edit-label">{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          className="input"
          type={isPass && show ? 'text' : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          style={{ width: '100%', boxSizing: 'border-box', paddingRight: isPass ? 42 : undefined }}
        />
        {isPass && (
          <button
            type="button"
            onClick={() => setShow(v => !v)}
            style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text3)', fontSize: 14, padding: 0,
            }}
            tabIndex={-1}
          >
            <i className={`fa-solid fa-eye${show ? '-slash' : ''}`} />
          </button>
        )}
      </div>
      {hint && <div className="edit-hint">{hint}</div>}
    </div>
  )
}

// ── TAB: Editar Perfil ───────────────────────────────────────────────
function ProfileTab({ user, token, lang, updateUser }) {
  const es = lang === 'es'

  // — Información personal —
  const [form,       setForm      ] = useState({
    first_name: user.first_name || '',
    last_name:  user.last_name  || '',
    email:      user.email      || '',
  })
  const [infoMsg,    setInfoMsg   ] = useState(null)   // { type: 'ok'|'err', text }
  const [infoSaving, setInfoSaving] = useState(false)

  // — Cambiar contraseña —
  const [pass,       setPass      ] = useState({ current: '', new: '', confirm: '' })
  const [passMsg,    setPassMsg   ] = useState(null)
  const [passSaving, setPassSaving] = useState(false)

  const setF = k => v => setForm(p => ({ ...p, [k]: v }))
  const setP = k => v => setPass(p => ({ ...p, [k]: v }))

  const saveInfo = async () => {
    setInfoSaving(true); setInfoMsg(null)
    try {
      const res  = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      updateUser(data.user)
      setInfoMsg({ type: 'ok', text: es ? '¡Perfil actualizado!' : 'Profile updated!' })
    } catch (err) {
      setInfoMsg({ type: 'err', text: err.message })
    } finally { setInfoSaving(false) }
  }

  const savePass = async () => {
    setPassSaving(true); setPassMsg(null)
    try {
      const res  = await fetch('/api/auth/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          current_password: pass.current,
          new_password:     pass.new,
          confirm_password: pass.confirm,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setPass({ current: '', new: '', confirm: '' })
      setPassMsg({ type: 'ok', text: data.message || (es ? '¡Contraseña actualizada!' : 'Password updated!') })
    } catch (err) {
      setPassMsg({ type: 'err', text: err.message })
    } finally { setPassSaving(false) }
  }

  return (
    <div>
      {/* — Información personal — */}
      <div className="card mb-16 edit-section">
        <div className="edit-section-title">
          <i className="fa-solid fa-circle-user" />
          {es ? 'Información personal' : 'Personal information'}
        </div>

        <div className="edit-row-2">
          <Field
            label={es ? 'Nombre' : 'First name'}
            value={form.first_name}
            onChange={setF('first_name')}
            placeholder="Erick"
            autoComplete="given-name"
          />
          <Field
            label={es ? 'Apellido' : 'Last name'}
            value={form.last_name}
            onChange={setF('last_name')}
            placeholder="De los Reyes"
            autoComplete="family-name"
          />
        </div>

        <Field
          label="Email"
          type="email"
          value={form.email}
          onChange={setF('email')}
          placeholder="correo@ejemplo.com"
          autoComplete="email"
        />

        {infoMsg && (
          <div className={`edit-msg edit-msg--${infoMsg.type}`}>
            <i className={`fa-solid fa-${infoMsg.type === 'ok' ? 'circle-check' : 'circle-exclamation'}`} />
            {infoMsg.text}
          </div>
        )}

        <button className="btn btn-gold" onClick={saveInfo} disabled={infoSaving}
          style={{ marginTop: 4 }}>
          {infoSaving
            ? <><i className="fa-solid fa-circle-notch fa-spin" />&nbsp;{es ? 'Guardando…' : 'Saving…'}</>
            : <><i className="fa-solid fa-floppy-disk" />&nbsp;{es ? 'Guardar cambios' : 'Save changes'}</>}
        </button>
      </div>

      {/* — Cambiar contraseña — */}
      <div className="card edit-section">
        <div className="edit-section-title">
          <i className="fa-solid fa-lock" />
          {es ? 'Cambiar contraseña' : 'Change password'}
        </div>

        <Field
          label={es ? 'Contraseña actual' : 'Current password'}
          type="password"
          value={pass.current}
          onChange={setP('current')}
          placeholder="••••••••"
          autoComplete="current-password"
        />
        <Field
          label={es ? 'Nueva contraseña' : 'New password'}
          type="password"
          value={pass.new}
          onChange={setP('new')}
          placeholder="••••••••"
          autoComplete="new-password"
          hint={es ? 'Mínimo 6 caracteres' : 'At least 6 characters'}
        />
        <Field
          label={es ? 'Confirmar contraseña' : 'Confirm password'}
          type="password"
          value={pass.confirm}
          onChange={setP('confirm')}
          placeholder="••••••••"
          autoComplete="new-password"
        />

        {passMsg && (
          <div className={`edit-msg edit-msg--${passMsg.type}`}>
            <i className={`fa-solid fa-${passMsg.type === 'ok' ? 'circle-check' : 'circle-exclamation'}`} />
            {passMsg.text}
          </div>
        )}

        <button className="btn btn-gold" onClick={savePass} disabled={passSaving}
          style={{ marginTop: 4 }}>
          {passSaving
            ? <><i className="fa-solid fa-circle-notch fa-spin" />&nbsp;{es ? 'Guardando…' : 'Saving…'}</>
            : <><i className="fa-solid fa-key" />&nbsp;{es ? 'Cambiar contraseña' : 'Change password'}</>}
        </button>
      </div>
    </div>
  )
}

// ── TAB: Notificaciones ──────────────────────────────────────────────
function NotificationsTab({ token, lang }) {
  const [prefs,   setPrefs  ] = useState(null)
  const [saving,  setSaving ] = useState(false)
  const [saved,   setSaved  ] = useState(false)
  const [loading, setLoading] = useState(true)
  const es = lang === 'es'

  useEffect(() => {
    if (!token) return
    fetch('/api/notifications/prefs', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setPrefs(data))
      .catch(() => setPrefs({ email_enabled: false, notify_match_1h: true, notify_news: true }))
      .finally(() => setLoading(false))
  }, [token])

  const set = useCallback((key, val) => {
    setPrefs(p => ({ ...p, [key]: val }))
    setSaved(false)
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      await fetch('/api/notifications/prefs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(prefs),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch { /* silencioso */ }
    finally { setSaving(false) }
  }

  if (loading) return (
    <div className="card" style={{ padding: '24px 20px' }}>
      <div className="skeleton" style={{ height: 18, width: 200, borderRadius: 6, marginBottom: 16 }} />
      <div className="skeleton" style={{ height: 14, width: '70%', borderRadius: 6 }} />
    </div>
  )

  return (
    <div className="card notif-card">
      {/* Toggle principal */}
      <div className="notif-card-header">
        <div>
          <div className="notif-card-title">
            <i className="fa-solid fa-bell" />
            {es ? 'Notificaciones por correo' : 'Email notifications'}
          </div>
          <div className="notif-card-sub">
            {es ? 'Recibe avisos directamente en tu email.' : 'Get alerts sent directly to your inbox.'}
          </div>
        </div>
        <Toggle checked={prefs.email_enabled} onChange={v => set('email_enabled', v)} />
      </div>

      {/* Sub-opciones */}
      {prefs.email_enabled && (
        <div className="notif-options">
          <div className="notif-option">
            <div className="notif-option-info">
              <i className="fa-solid fa-futbol notif-option-icon" />
              <div>
                <div className="notif-option-label">{es ? 'Partidos favoritos' : 'Favorite matches'}</div>
                <div className="notif-option-sub">{es ? '1 hora antes del inicio' : '1 hour before kick-off'}</div>
              </div>
            </div>
            <Toggle checked={prefs.notify_match_1h} onChange={v => set('notify_match_1h', v)} />
          </div>

          <div className="notif-option">
            <div className="notif-option-info">
              <i className="fa-solid fa-newspaper notif-option-icon" />
              <div>
                <div className="notif-option-label">{es ? 'Noticias de favoritos' : 'Favorites news'}</div>
                <div className="notif-option-sub">
                  {es ? 'Artículos sobre tus equipos y jugadores' : 'Articles about your teams and players'}
                </div>
              </div>
            </div>
            <Toggle checked={prefs.notify_news} onChange={v => set('notify_news', v)} />
          </div>
        </div>
      )}

      <div className="notif-card-footer">
        <button
          className={`btn btn-sm${saved ? ' btn-outline' : ' btn-gold'}`}
          onClick={save} disabled={saving}
        >
          {saving
            ? <><i className="fa-solid fa-circle-notch fa-spin" />&nbsp;{es ? 'Guardando…' : 'Saving…'}</>
            : saved
              ? <><i className="fa-solid fa-check" />&nbsp;{es ? '¡Guardado!' : 'Saved!'}</>
              : <><i className="fa-solid fa-floppy-disk" />&nbsp;{es ? 'Guardar cambios' : 'Save changes'}</>}
        </button>
      </div>
    </div>
  )
}

// ── TAB: Favoritos ───────────────────────────────────────────────────
const FAV_TABS = ['teams', 'players', 'matches', 'articles']

function FavTeams({ teams, navigate }) {
  if (!teams.length) return <EmptyFavs type="teams" />
  return (
    <div>
      {teams.map(team => (
        <button key={team.id} className="account-fav-item" onClick={() => navigate(`/teams/${team.id}`)}>
          <TeamFlag name={team.name} />
          <div>
            <div className="account-fav-name">{team.name}</div>
            <div className="account-fav-sub">{team.confederation} · {team.titles > 0 ? `${team.titles}× 🏆` : '—'}</div>
          </div>
          <i className="fa-solid fa-chevron-right" style={{ marginLeft: 'auto', color: 'var(--text3)', fontSize: 11 }} />
        </button>
      ))}
    </div>
  )
}

function FavPlayers({ players, navigate, t }) {
  if (!players.length) return <EmptyFavs type="players" />
  return (
    <div>
      {players.map(player => (
        <button key={player.id} className="account-fav-item"
          onClick={() => navigate(`/players/${player.id}`, { state: { player } })}>
          {player.photo
            ? <img src={player.photo} alt={player.name} className="account-fav-avatar" onError={e => { e.target.style.display = 'none' }} />
            : <div className="account-fav-emoji">{player.emoji || '⭐'}</div>
          }
          <div>
            <div className="account-fav-name">{player.name}</div>
            <div className="account-fav-sub">
              <span className="badge badge-blue" style={{ fontSize: 9, marginRight: 5 }}>{player.pos}</span>
              {player.nation} · {player.age} {t('player', 'yrs')}
            </div>
          </div>
          <i className="fa-solid fa-chevron-right" style={{ marginLeft: 'auto', color: 'var(--text3)', fontSize: 11 }} />
        </button>
      ))}
    </div>
  )
}

function FavMatches({ matches, navigate }) {
  if (!matches.length) return <EmptyFavs type="matches" />
  return (
    <div>
      {matches.map(match => (
        <button key={match.id} className="account-fav-item" onClick={() => navigate(`/matches/${match.id}`)}>
          <div className="account-fav-emoji">
            <i className="fa-solid fa-futbol" style={{ color: 'var(--gold)' }} />
          </div>
          <div>
            <div className="account-fav-name">{match.team1} vs {match.team2}</div>
            <div className="account-fav-sub">{match.group} · {match.venue || match.stadium || '—'}</div>
          </div>
          <i className="fa-solid fa-chevron-right" style={{ marginLeft: 'auto', color: 'var(--text3)', fontSize: 11 }} />
        </button>
      ))}
    </div>
  )
}

function FavArticles({ articles }) {
  if (!articles.length) return <EmptyFavs type="articles" />
  return (
    <div>
      {articles.map(article => {
        const hasUrl = !!article.url
        const Tag    = hasUrl ? 'a' : 'div'
        return (
          <Tag
            key={article.id}
            {...(hasUrl ? { href: article.url, target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="account-fav-item"
            style={{ textDecoration: 'none' }}
          >
            <div className="account-fav-emoji" style={{ fontSize: 20 }}>{article.emoji || '📰'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="account-fav-name" style={{
                display: '-webkit-box', WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>{article.title}</div>
              {(article.excerpt || article.description) && (
                <div className="account-fav-sub" style={{
                  display: '-webkit-box', WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>{article.excerpt || article.description}</div>
              )}
              <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
                  padding: '2px 7px', borderRadius: 8,
                  background: `${article.color || '#64748b'}18`,
                  color: article.color || '#64748b',
                  border: `1px solid ${article.color || '#64748b'}44`,
                }}>
                  {article.emoji} {article.catLabel || article.cat}
                </span>
                {article.source && <span style={{ fontSize: 10, color: 'var(--text3)' }}>{article.source}</span>}
              </div>
            </div>
            {hasUrl && <i className="fa-solid fa-arrow-up-right-from-square"
              style={{ marginLeft: 8, color: 'var(--text3)', fontSize: 11, flexShrink: 0 }} />}
          </Tag>
        )
      })}
    </div>
  )
}

function EmptyFavs({ type }) {
  const icons = { teams: 'fa-shield-halved', players: 'fa-users', matches: 'fa-futbol', articles: 'fa-newspaper' }
  return (
    <div className="account-favs-empty">
      <div className="account-favs-empty-icon"><i className={`fa-solid ${icons[type] || 'fa-heart'}`} /></div>
      <div className="account-favs-empty-title">No hay favoritos aquí aún</div>
      <div style={{ fontSize: 12 }}>Agrega tocando el botón ♥ en cualquier equipo, jugador o partido.</div>
    </div>
  )
}

function FavoritesTab({ favorites, navigate, lang, t }) {
  const [activeTab, setActiveTab] = useState('teams')
  const es = lang === 'es'

  const totalFavs = (favorites.teams?.length || 0) + (favorites.players?.length || 0)
                  + (favorites.matches?.length || 0) + (favorites.articles?.length || 0)

  const tabLabels = {
    teams:    es ? 'Equipos'   : 'Teams',
    players:  es ? 'Jugadores' : 'Players',
    matches:  es ? 'Partidos'  : 'Matches',
    articles: es ? 'Noticias'  : 'News',
  }

  if (totalFavs === 0) return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}><EmptyFavs type="all" /></div>
  )

  return (
    <>
      <div className="scroll-tabs mb-16" role="tablist">
        {FAV_TABS.map(tab => (
          <button
            key={tab}
            className={`scroll-tab${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
            role="tab" aria-selected={activeTab === tab}
          >
            {tabLabels[tab]}
            {favorites[tab]?.length > 0 && (
              <span style={{
                marginLeft: 6, fontSize: 10, background: 'rgba(240,180,41,0.15)',
                color: 'var(--gold)', borderRadius: 10, padding: '1px 6px', fontWeight: 700,
              }}>
                {favorites[tab].length}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {activeTab === 'teams'    && <FavTeams    teams={favorites.teams || []}       navigate={navigate} />}
        {activeTab === 'players'  && <FavPlayers  players={favorites.players || []}   navigate={navigate} t={t} />}
        {activeTab === 'matches'  && <FavMatches  matches={favorites.matches || []}   navigate={navigate} />}
        {activeTab === 'articles' && <FavArticles articles={favorites.articles || []} />}
      </div>
    </>
  )
}

// ── Página principal ─────────────────────────────────────────────────
export default function AccountPage() {
  const { user, authLoading, logout, token, updateUser } = useAuth()
  const { favorites }   = useApp()
  const { lang, t }     = useLang()
  const navigate        = useNavigate()
  const [tab, setTab]   = useState('perfil')

  useEffect(() => {
    if (!authLoading && !user) navigate('/', { replace: true })
  }, [user, authLoading, navigate])

  if (authLoading || !user) return null

  const es       = lang === 'es'
  const initials = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
  const totalFavs = (favorites.teams?.length || 0) + (favorites.players?.length || 0)
                  + (favorites.matches?.length || 0) + (favorites.articles?.length || 0)

  const TABS = [
    { key: 'perfil',         icon: 'fa-circle-user',  label: es ? 'Mi perfil'        : 'My profile'       },
    { key: 'notificaciones', icon: 'fa-bell',          label: es ? 'Notificaciones'   : 'Notifications'    },
    { key: 'favoritos',      icon: 'fa-heart',         label: es ? 'Mis favoritos'    : 'My favorites',
      badge: totalFavs || null },
  ]

  return (
    <div className="page-content page-enter">

      {/* ── Profile card ── */}
      <div className="account-profile-card">
        <div className="account-avatar" aria-hidden="true">{initials}</div>
        <div className="account-info">
          <div className="account-name">{user.first_name} {user.last_name}</div>
          <div className="account-email">{user.email}</div>
          <div className="account-since">
            <i className="fa-solid fa-calendar-days" />
            {es ? 'Miembro desde' : 'Member since'} {formatDate(user.created_at, lang)}
          </div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={logout} style={{ flexShrink: 0 }}>
          <i className="fa-solid fa-arrow-right-from-bracket" />
          {es ? 'Salir' : 'Log Out'}
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="account-stats">
        {[
          { val: favorites.teams?.length    || 0, lbl: es ? 'Equipos'   : 'Teams'   },
          { val: favorites.players?.length  || 0, lbl: es ? 'Jugadores' : 'Players' },
          { val: favorites.matches?.length  || 0, lbl: es ? 'Partidos'  : 'Matches' },
          { val: favorites.articles?.length || 0, lbl: es ? 'Noticias'  : 'News'    },
        ].map(s => (
          <div key={s.lbl} className="account-stat-card">
            <div className="account-stat-val">{s.val}</div>
            <div className="account-stat-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs de navegación ── */}
      <div className="account-tabs mb-20" role="tablist">
        {TABS.map(tb => (
          <button
            key={tb.key}
            className={`account-tab${tab === tb.key ? ' active' : ''}`}
            onClick={() => setTab(tb.key)}
            role="tab"
            aria-selected={tab === tb.key}
          >
            <i className={`fa-solid ${tb.icon}`} />
            <span>{tb.label}</span>
            {tb.badge ? (
              <span className="account-tab-badge">{tb.badge}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* ── Contenido del tab activo ── */}
      {tab === 'perfil' && (
        <ProfileTab user={user} token={token} lang={lang} updateUser={updateUser} />
      )}
      {tab === 'notificaciones' && (
        <NotificationsTab token={token} lang={lang} />
      )}
      {tab === 'favoritos' && (
        <FavoritesTab favorites={favorites} navigate={navigate} lang={lang} t={t} />
      )}

      {/* ── Donate ── */}
      <a
        href="https://buymeacoffee.com/delosreyes305"
        target="_blank"
        rel="noopener noreferrer"
        className="account-donate-btn"
      >
        ☕ {es ? 'Invítame un café' : 'Buy me a coffee'}
      </a>

    </div>
  )
}
