import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { useAuth } from '../context/AuthContext'
import { getAllFixtures, TEAM_ISO } from '../services/sportsService'
import {
  getQuinielaProfile, saveQuinielaProfile,
  getMyPredictions, upsertPrediction,
  getGlobalLeaderboard,
  getMyLeagues, createLeague, joinLeague,
  getLeagueLeaderboard, leaveLeague, deleteLeague,
} from '../services/quinielaService'

// ── Avatar color options ──────────────────────────────────────────────
const AVATAR_COLORS = [
  '#f0b429','#3b82f6','#10b981','#ef4444',
  '#8b5cf6','#f97316','#06b6d4','#ec4899',
  '#404040','#ffffff','#959595','#49779d',
  '#5a3939','#475647','#b9a2e1','#9b6046',
]

// ── Helpers ───────────────────────────────────────────────────────────
function pad(n) { return String(n).padStart(2, '0') }

function isLocked(matchDate) {
  if (!matchDate) return false
  return new Date() >= new Date(matchDate.replace(' ', 'T') + (matchDate.includes('Z') || matchDate.includes('+') ? '' : 'Z'))
}

function resultLabel(home, away, lang) {
  if (home > away)  return lang === 'es' ? 'Victoria local' : 'Home win'
  if (away > home)  return lang === 'es' ? 'Victoria visitante' : 'Away win'
  return lang === 'es' ? 'Empate' : 'Draw'
}

function FlagImg({ name, size = 28 }) {
  const iso = TEAM_ISO[name]
  if (!iso) return null
  return (
    <img
      src={`https://flagcdn.com/w80/${iso}.png`}
      alt={name}
      style={{ width: Math.round(size * 1.5), height: size, objectFit: 'cover',
               borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}
      onError={e => { e.target.style.display = 'none' }}
    />
  )
}

function Avatar({ alias, color, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: color || '#f0b429',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.38, color: '#0a0e1a',
    }}>
      {(alias || '?')[0].toUpperCase()}
    </div>
  )
}

function ChampionsBanner({ lang }) {
  const [champions, setChampions] = React.useState(null)

  React.useEffect(() => {
    fetch('/api/quiniela/champions')
      .then(r => r.json())
      .then(d => setChampions(d.champions))
      .catch(() => {})
  }, [])

  if (!champions || !Object.keys(champions).length) return null

  const phases = [
    { key: 'group_stage', label: lang === 'es' ? 'Campeón Fase de Grupos'    : 'Group Stage Champion', icon: 'fa-users' },
    { key: 'knockout',    label: lang === 'es' ? 'Campeón Fase Eliminatoria' : 'Knockout Champion',    icon: 'fa-shield-halved' },
    { key: 'overall',     label: lang === 'es' ? 'Campeón General'           : 'Overall Champion',     icon: 'fa-crown' },
  ].filter(p => champions[p.key])

  if (!phases.length) return null

  return (
    <div style={{ marginBottom: 16 }}>
      {phases.map(phase => {
        const c = champions[phase.key]
        return (
          <div key={phase.key} className="card" style={{
            marginBottom: 8,
            background: 'linear-gradient(135deg, rgba(240,180,41,0.12), rgba(240,180,41,0.04))',
            border: '1px solid rgba(240,180,41,0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <i className={`fa-solid ${phase.icon}`} style={{ fontSize: 22, color: 'var(--gold)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>
                  {phase.label}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar alias={c.alias} color={c.avatar_color} size={28} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{c.alias}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--gold)', lineHeight: 1 }}>
                  {c.points}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase' }}>pts</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// SETUP PROFILE — First time screen
// ─────────────────────────────────────────────────────────────────────
function SetupProfile({ token, lang, onSaved }) {
  const [alias, setAlias]   = useState('')
  const [color, setColor]   = useState(AVATAR_COLORS[0])
  const [error, setError]   = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const trimmed = alias.trim()
    if (!trimmed) return setError(lang === 'es' ? 'El alias es requerido' : 'Alias is required')
    if (trimmed.length < 3) return setError(lang === 'es' ? 'Mínimo 3 caracteres' : 'Minimum 3 characters')
    setSaving(true); setError('')
    try {
      const data = await saveQuinielaProfile(token, { alias: trimmed, avatar_color: color })
      onSaved(data.profile)
    } catch (e) {
      setError(e.message?.includes('taken')
        ? (lang === 'es' ? 'Ese alias ya está tomado' : 'Alias already taken')
        : e.message)
    } finally { setSaving(false) }
  }

  return (
    <div className="page-content page-enter" style={{ maxWidth: 420, margin: '0 auto' }}>
      <div className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
        <i className="fa-solid fa-trophy" style={{ fontSize: 40, color: 'var(--gold)', marginBottom: 16 }} />
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
          {lang === 'es' ? 'Crea tu perfil de quiniela' : 'Create your quiniela profile'}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24, lineHeight: 1.6 }}>
          {lang === 'es'
            ? 'Tu alias es público en el leaderboard. No usamos tu nombre real.'
            : 'Your alias is public on the leaderboard. We never show your real name.'}
        </p>

        {/* Alias input */}
        <input
          type="text"
          placeholder={lang === 'es' ? 'Tu alias (ej: ElMessi10)' : 'Your alias (e.g. GolazoKing)'}
          value={alias}
          onChange={e => setAlias(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
          maxLength={30}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 8,
            background: 'var(--card2)', border: '1px solid var(--border)',
            color: 'var(--text)', fontSize: 15, marginBottom: 16,
            boxSizing: 'border-box',
          }}
        />

        {/* Avatar preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Avatar alias={alias || '?'} color={color} size={48} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {AVATAR_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 24, height: 24, borderRadius: '50%', background: c,
                  border: c === color ? '3px solid white' : '2px solid transparent',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>

        {error && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{error}</p>}

        <button
          className="btn btn-gold"
          style={{ width: '100%' }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving
            ? (lang === 'es' ? 'Guardando...' : 'Saving...')
            : (lang === 'es' ? 'Entrar a la quiniela' : 'Join the quiniela')}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// PREDICT TAB — list of upcoming fixtures with score inputs
// ─────────────────────────────────────────────────────────────────────
function PredictTab({ token, lang, predictions, onPredictionSaved }) {
  const [fixtures,  setFixtures]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [inputs,    setInputs]    = useState({})   // { fixtureId: { home, away } }
  const [saving,    setSaving]    = useState({})
  const [messages,  setMessages]  = useState({})

  // Build input map from existing predictions
  useEffect(() => {
    const map = {}
    predictions.forEach(p => {
      map[p.fixture_id] = { home: String(p.pred_home), away: String(p.pred_away) }
    })
    setInputs(map)
  }, [predictions])

  useEffect(() => {
    getAllFixtures().then(all => {
      const upcoming = (all || [])
        .filter(m => m.status === 'upcoming' || m.status === 'live')
        .sort((a, b) => new Date(a.date) - new Date(b.date))
      setFixtures(upcoming)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const setInput = (fixtureId, side, val) => {
    const clean = val.replace(/[^0-9]/g, '').slice(0, 2)
    setInputs(prev => ({
      ...prev,
      [fixtureId]: { ...prev[fixtureId], [side]: clean },
    }))
  }

  const handleSave = async (fixture) => {
    const inp = inputs[fixture.id] || {}
    const home = parseInt(inp.home ?? '', 10)
    const away = parseInt(inp.away ?? '', 10)

    if (isNaN(home) || isNaN(away)) {
      return setMessages(p => ({ ...p, [fixture.id]: { type: 'error', text: lang === 'es' ? 'Ingresa ambos marcadores' : 'Enter both scores' } }))
    }

    setSaving(p => ({ ...p, [fixture.id]: true }))
    setMessages(p => ({ ...p, [fixture.id]: null }))
    try {
      await upsertPrediction(token, {
        fixture_id: fixture.id,
        pred_home:  home,
        pred_away:  away,
        team1:      fixture.team1,
        team2:      fixture.team2,
        flag1:      fixture.flag1,
        flag2:      fixture.flag2,
        group:      fixture.group,
        match_date: fixture.date,
      })
      setMessages(p => ({ ...p, [fixture.id]: { type: 'ok', text: lang === 'es' ? 'Guardado' : 'Saved' } }))
      onPredictionSaved()
    } catch (e) {
      setMessages(p => ({ ...p, [fixture.id]: { type: 'error', text: e.message } }))
    } finally {
      setSaving(p => ({ ...p, [fixture.id]: false }))
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 10 }} />)}
    </div>
  )

  if (!fixtures.length) return (
    <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)' }}>
      <i className="fa-solid fa-futbol" style={{ fontSize: 32, marginBottom: 12, display: 'block' }} />
      {lang === 'es' ? 'No hay partidos disponibles para predecir.' : 'No matches available to predict.'}
    </div>
  )

  // Group by date
  const grouped = {}
  fixtures.forEach(f => {
    const key = f.date ? new Date(f.date).toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'TBD'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(f)
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Object.entries(grouped).map(([date, matches]) => (
        <div key={date}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: 'var(--text3)',
            textTransform: 'uppercase', margin: '16px 0 8px', paddingLeft: 4 }}>
            {date}
          </p>
          {matches.map(fixture => {
            const inp     = inputs[fixture.id] || {}
            const locked  = isLocked(fixture.date)
            const pred    = predictions.find(p => p.fixture_id === fixture.id)
            const msg     = messages[fixture.id]
            const isSaving = saving[fixture.id]
            const hasInput = inp.home !== undefined && inp.away !== undefined

            return (
              <div key={fixture.id} className="card" style={{
                padding: '14px 16px', marginBottom: 6,
                border: locked ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(240,180,41,0.12)',
                opacity: locked && !pred ? 0.6 : 1,
              }}>
                {/* Match header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span className="caption" style={{ fontSize: 10, color: 'var(--text3)' }}>{fixture.group}</span>
                  {locked
                    ? <span className="badge badge-gray" style={{ fontSize: 10 }}>
                        <i className="fa-solid fa-lock" style={{ marginRight: 4 }} />
                        {lang === 'es' ? 'Cerrado' : 'Locked'}
                      </span>
                    : <span style={{ fontSize: 10, color: 'var(--gold)' }}>
                        {fixture.date ? new Date(fixture.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                  }
                </div>

                {/* Teams + inputs */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* Home team */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, textAlign: 'right', color: 'var(--text)' }}>
                      {fixture.team1}
                    </span>
                    <FlagImg name={fixture.team1} size={22} />
                  </div>

                  {/* Score inputs */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <input
                      type="number" min="0" max="99"
                      value={inp.home ?? ''}
                      onChange={e => setInput(fixture.id, 'home', e.target.value)}
                      disabled={locked}
                      style={{
                        width: 38, height: 36, textAlign: 'center', fontSize: 16, fontWeight: 700,
                        borderRadius: 6, background: locked ? 'var(--card2)' : 'rgba(240,180,41,0.08)',
                        border: `1px solid ${locked ? 'var(--border)' : 'rgba(240,180,41,0.3)'}`,
                        color: 'var(--text)',
                      }}
                    />
                    <span style={{ color: 'var(--text3)', fontWeight: 700 }}>–</span>
                    <input
                      type="number" min="0" max="99"
                      value={inp.away ?? ''}
                      onChange={e => setInput(fixture.id, 'away', e.target.value)}
                      disabled={locked}
                      style={{
                        width: 38, height: 36, textAlign: 'center', fontSize: 16, fontWeight: 700,
                        borderRadius: 6, background: locked ? 'var(--card2)' : 'rgba(240,180,41,0.08)',
                        border: `1px solid ${locked ? 'var(--border)' : 'rgba(240,180,41,0.3)'}`,
                        color: 'var(--text)',
                      }}
                    />
                  </div>

                  {/* Away team */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FlagImg name={fixture.team2} size={22} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                      {fixture.team2}
                    </span>
                  </div>
                </div>

                {/* Save button + message */}
                {!locked && (
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                    {msg && (
                      <span style={{ fontSize: 11, color: msg.type === 'ok' ? 'var(--green)' : 'var(--red)' }}>
                        {msg.type === 'ok'
                          ? <i className="fa-solid fa-check" style={{ marginRight: 4 }} />
                          : <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 4 }} />
                        }
                        {msg.text}
                      </span>
                    )}
                    <button
                      className="btn btn-sm btn-gold"
                      onClick={() => handleSave(fixture)}
                      disabled={isSaving || !hasInput}
                      style={{ fontSize: 11, padding: '5px 14px' }}
                    >
                      {isSaving
                        ? <i className="fa-solid fa-spinner fa-spin" />
                        : (pred ? (lang === 'es' ? 'Actualizar' : 'Update') : (lang === 'es' ? 'Guardar' : 'Save'))
                      }
                    </button>
                  </div>
                )}

                {/* Locked — show saved prediction */}
                {locked && pred && (
                  <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text3)', textAlign: 'center' }}>
                    {lang === 'es' ? 'Tu predicción:' : 'Your pick:'}{' '}
                    <strong style={{ color: 'var(--gold)' }}>{pred.pred_home} – {pred.pred_away}</strong>
                    {pred.score && (
                      <span style={{ marginLeft: 8, color: pred.score.points > 0 ? 'var(--green)' : 'var(--red)' }}>
                        {pred.score.correct_score
                          ? (lang === 'es' ? '· Marcador exacto +5' : '· Exact score +5')
                          : pred.score.correct_winner
                            ? (lang === 'es' ? '· Ganador correcto +3' : '· Correct winner +3')
                            : (lang === 'es' ? '· Sin puntos' : '· No points')
                        }
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// LEADERBOARD ROW
// ─────────────────────────────────────────────────────────────────────
function LeaderboardTable({ board, lang }) {
  if (!board?.length) return (
    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)', fontSize: 13 }}>
      {lang === 'es' ? 'Aún no hay participantes.' : 'No participants yet.'}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {board.map(entry => (
        <div key={entry.alias} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 10,
          background: entry.is_me ? 'rgba(240,180,41,0.08)' : 'var(--card2)',
          border: entry.is_me ? '1px solid rgba(240,180,41,0.25)' : '1px solid rgba(255,255,255,0.04)',
        }}>
          {/* Rank */}
          <div style={{
            width: 28, height: 28, borderRadius: 6, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 13,
            background: entry.rank <= 3
              ? ['#f0b429','#94a3b8','#cd7f32'][entry.rank - 1]
              : 'rgba(255,255,255,0.06)',
            color: entry.rank <= 3 ? '#0a0e1a' : 'var(--text3)',
          }}>
            {entry.rank}
          </div>

          <Avatar alias={entry.alias} color={entry.avatar_color} size={32} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {entry.alias}
              {entry.is_me && (
                <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--gold)' }}>
                  {lang === 'es' ? '(yo)' : '(me)'}
                </span>
              )}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)' }}>
              <i className="fa-solid fa-check" style={{ marginRight: 3 }} />{entry.correct_winners}{' '}
              <i className="fa-solid fa-bullseye" style={{ marginRight: 3, marginLeft: 6 }} />{entry.correct_scores}
            </div>
          </div>

          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--gold)', lineHeight: 1 }}>
              {entry.total_points}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              pts
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// MY PREDICTIONS — history of past (locked) predictions with results
// ─────────────────────────────────────────────────────────────────────
function MyPredictionsTab({ predictions, lang }) {
  const past = (predictions || [])
    .filter(p => isLocked(p.match_date))
    .sort((a, b) => new Date(b.match_date) - new Date(a.match_date)) // most recent first

  if (!past.length) return (
    <div className="card" style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--text3)' }}>
      <div style={{ fontSize: 32, marginBottom: 12, color: 'var(--gold)' }}>
        <i className="fa-solid fa-clock-rotate-left" aria-hidden="true" />
      </div>
      <div className="fw-600" style={{ fontSize: 14, marginBottom: 6, color: 'var(--text)' }}>
        {lang === 'es' ? 'Aún no tienes predicciones anteriores' : 'No past predictions yet'}
      </div>
      <div style={{ fontSize: 12 }}>
        {lang === 'es'
          ? 'Cuando un partido que predijiste comience, aparecerá aquí.'
          : 'Once a match you predicted starts, it will show up here.'}
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {past.map(p => {
        const s        = p.score
        const dateObj  = p.match_date ? new Date(p.match_date) : null
        const dateStr  = dateObj
          ? dateObj.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { day: '2-digit', month: 'short' })
          : ''

        // Badge: exact score (5) > correct winner (3) > wrong (0) > pending (no score yet)
        let badge
        if (!s) {
          badge = { text: lang === 'es' ? 'Pendiente' : 'Pending', color: 'var(--text3)', bg: 'rgba(255,255,255,0.06)' }
        } else if (s.correct_score) {
          badge = { text: `+${s.points} ⭐`, color: 'var(--gold)', bg: 'rgba(240,180,41,0.12)' }
        } else if (s.correct_winner) {
          badge = { text: `+${s.points}`, color: 'var(--green)', bg: 'rgba(34,197,94,0.12)' }
        } else {
          badge = { text: '0', color: 'var(--text3)', bg: 'rgba(255,255,255,0.06)' }
        }

        return (
          <div key={p.id} className="card" style={{
            padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            {/* Date */}
            <div style={{ fontSize: 10, color: 'var(--text3)', flexShrink: 0, minWidth: 38, textAlign: 'center' }}>
              {dateStr}
            </div>

            {/* Teams + scores */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <FlagImg name={p.team1} size={16} />
                <span className="fw-600" style={{ fontSize: 12, color: 'var(--text)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.team1}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                  {s ? `${s.actual_home}-${s.actual_away}` : '–'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FlagImg name={p.team2} size={16} />
                <span className="fw-600" style={{ fontSize: 12, color: 'var(--text)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.team2}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                  {s ? `${s.actual_away}-${s.actual_home}` : '–'}
                </span>
              </div>
            </div>

            {/* My prediction */}
            <div style={{ textAlign: 'center', flexShrink: 0, padding: '0 6px' }}>
              <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
                {lang === 'es' ? 'Mi pred.' : 'My pick'}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--text)' }}>
                {p.pred_home}-{p.pred_away}
              </div>
            </div>

            {/* Points badge */}
            <div style={{
              flexShrink: 0, minWidth: 56, textAlign: 'center', padding: '4px 8px',
              borderRadius: 8, background: badge.bg, color: badge.color,
              fontSize: 12, fontWeight: 700,
            }}>
              {badge.text}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// GLOBAL LEADERBOARD TAB
// ─────────────────────────────────────────────────────────────────────
function GlobalTab({ token, lang, myProfile }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await getGlobalLeaderboard(token)
      setData(res)
    } catch {}
    setLoading(false)
  }, [token])

  useEffect(() => { load() }, [load])

  return (
    <div>
      {/* My rank highlight */}
      {data?.my_rank && (
        <div className="card mb-16" style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'linear-gradient(135deg,rgba(240,180,41,0.10),rgba(240,180,41,0.04))',
          border: '1px solid rgba(240,180,41,0.2)',
        }}>
          <i className="fa-solid fa-ranking-star" style={{ fontSize: 24, color: 'var(--gold)' }} />
          <div>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>
              {lang === 'es' ? 'Tu posición global' : 'Your global rank'}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--gold)', lineHeight: 1 }}>
              #{data.my_rank}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
              {data.my_profile?.total_points ?? 0} pts
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>
              {data.total} {lang === 'es' ? 'participantes' : 'participants'}
            </div>
          </div>
        </div>
      )}

      {loading
        ? [1,2,3,4,5].map(i => <div key={i} className="skeleton mb-6" style={{ height: 56, borderRadius: 10 }} />)
        : <LeaderboardTable board={data?.leaderboard} lang={lang} />
      }
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// PRIVATE LEAGUES TAB
// ─────────────────────────────────────────────────────────────────────
function MemberPredictionsModal({ token, lang, leagueId, userId, alias, onClose }) {
  const [preds, setPreds] = useState(null)

  useEffect(() => {
    fetch(`/api/quiniela/leagues/${leagueId}/member/${userId}/predictions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => setPreds(d.predictions || []))
      .catch(() => setPreds([]))
  }, [leagueId, userId, token])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--card)', borderRadius: '16px 16px 0 0',
        padding: '20px 16px', width: '100%', maxWidth: 480,
        maxHeight: '80vh', overflowY: 'auto',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
            {lang === 'es' ? `Predicciones de ${alias}` : `${alias}'s predictions`}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 18 }}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        {!preds
          ? [1,2,3].map(i => <div key={i} className="skeleton mb-6" style={{ height: 40, borderRadius: 8 }} />)
          : !preds.length
            ? <p style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                {lang === 'es' ? 'Sin predicciones disponibles aún.' : 'No predictions available yet.'}
              </p>
            : preds.map(p => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', borderRadius: 8, marginBottom: 6,
                  background: 'var(--card2)', border: '1px solid var(--border)',
                }}>
                  <span style={{ flex: 1, fontSize: 12, color: 'var(--text)', textAlign: 'right' }}>{p.team1}</span>
                  <span style={{ fontWeight: 700, color: 'var(--gold)', fontSize: 14, minWidth: 48, textAlign: 'center' }}>
                    {p.pred_home} – {p.pred_away}
                  </span>
                  <span style={{ flex: 1, fontSize: 12, color: 'var(--text)' }}>{p.team2}</span>
                  {p.score && (
                    <span style={{ fontSize: 11, color: p.score.points > 0 ? 'var(--green)' : 'var(--text3)', flexShrink: 0 }}>
                      +{p.score.points}
                    </span>
                  )}
                </div>
              ))
        }
      </div>
    </div>
  )
}

function LeagueChampionsBanner({ token, leagueId, lang }) {
  const [champions, setChampions] = React.useState(null)

  React.useEffect(() => {
    fetch(`/api/quiniela/leagues/${leagueId}/champions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => setChampions(d.champions))
      .catch(() => {})
  }, [leagueId])

  if (!champions || !Object.keys(champions).length) return null

  const phases = [
    { key: 'group_stage', label: lang === 'es' ? 'Campeón Fase de Grupos'    : 'Group Stage Champion', icon: 'fa-users' },
    { key: 'knockout',    label: lang === 'es' ? 'Campeón Fase Eliminatoria' : 'Knockout Champion',    icon: 'fa-shield-halved' },
    { key: 'overall',     label: lang === 'es' ? 'Campeón General'           : 'Overall Champion',     icon: 'fa-crown' },
  ].filter(p => champions[p.key])

  if (!phases.length) return null

  return (
    <div style={{ marginBottom: 16 }}>
      {phases.map(phase => {
        const c = champions[phase.key]
        return (
          <div key={phase.key} className="card" style={{
            marginBottom: 8,
            background: 'linear-gradient(135deg, rgba(240,180,41,0.12), rgba(240,180,41,0.04))',
            border: '1px solid rgba(240,180,41,0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <i className={`fa-solid ${phase.icon}`} style={{ fontSize: 22, color: 'var(--gold)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>
                  {phase.label}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar alias={c.alias} color={c.avatar_color} size={28} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{c.alias}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--gold)', lineHeight: 1 }}>
                  {c.points}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase' }}>pts</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function LeaguesTab({ token, lang, userId }) {
  const [leagues,       setLeagues]       = useState([])
  const [loading,       setLoading]       = useState(true)
  const [selectedLeague, setSelectedLeague] = useState(null)
  const [leagueBoard,   setLeagueBoard]   = useState(null)
  const [viewingMember, setViewingMember] = useState(null)
  const [copied,        setCopied]        = useState(false)
  const [creating,      setCreating]      = useState(false)
  const [joining,       setJoining]       = useState(false)
  const [newName,       setNewName]       = useState('')
  const [joinCode,      setJoinCode]      = useState('')
  const [actionError,   setActionError]   = useState('')
  const [showCreate,    setShowCreate]    = useState(false)
  const [showJoin,      setShowJoin]      = useState(false)

  const loadLeagues = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getMyLeagues(token)
      setLeagues(res.leagues || [])
    } catch {}
    setLoading(false)
  }, [token])

  useEffect(() => { loadLeagues() }, [loadLeagues])

  const openLeague = async (league) => {
    setSelectedLeague(league)
    setLeagueBoard(null)
    try {
      const res = await getLeagueLeaderboard(token, league.id)
      setLeagueBoard(res)
    } catch {}
  }

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return setActionError(lang === 'es' ? 'Ingresa un nombre' : 'Enter a name')
    setCreating(true); setActionError('')
    try {
      await createLeague(token, name)
      setNewName(''); setShowCreate(false)
      await loadLeagues()
    } catch (e) { setActionError(e.message) }
    finally { setCreating(false) }
  }

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase()
    if (!code) return setActionError(lang === 'es' ? 'Ingresa el código' : 'Enter the code')
    setJoining(true); setActionError('')
    try {
      await joinLeague(token, code)
      setJoinCode(''); setShowJoin(false)
      await loadLeagues()
    } catch (e) { setActionError(e.message) }
    finally { setJoining(false) }
  }

  const handleLeave = async (league) => {
    try {
      await leaveLeague(token, league.id)
      setSelectedLeague(null)
      await loadLeagues()
    } catch (e) { alert(e.message) }
  }

  const handleDelete = async (league) => {
    if (!window.confirm(lang === 'es' ? '¿Eliminar esta quiniela?' : 'Delete this league?')) return
    try {
      await deleteLeague(token, league.id)
      setSelectedLeague(null)
      await loadLeagues()
    } catch (e) { alert(e.message) }
  }

  // Detail view
  if (selectedLeague) return (
    <div>
      <button className="btn btn-ghost btn-sm mb-16" onClick={() => setSelectedLeague(null)}>
        ← {lang === 'es' ? 'Mis quinielas' : 'My leagues'}
      </button>
      <div className="card mb-16">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>{selectedLeague.name}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                {lang === 'es' ? 'Código de invitación:' : 'Invite code:'}
              </span>
              <code style={{
                fontSize: 14, fontWeight: 700, letterSpacing: 2,
                color: 'var(--gold)', background: 'rgba(240,180,41,0.1)',
                padding: '2px 8px', borderRadius: 6,
              }}>
                {selectedLeague.invite_code}
              </code>
              <button onClick={() => { navigator.clipboard?.writeText(selectedLeague.invite_code); setCopied(true); setTimeout(() => setCopied(false), 2000) }} style={{ background: "none", border: "none", color: copied ? "var(--green)" : "var(--text3)", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}><i className={copied ? "fa-solid fa-check" : "fa-regular fa-copy"} />{copied && <span style={{ fontSize: 10 }}>{lang === "es" ? "Copiado" : "Copied"}</span>}</button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {selectedLeague.owner_id === userId
              ? <button className="btn btn-sm" style={{ color: 'var(--red)', borderColor: 'var(--red)', fontSize: 11 }}
                  onClick={() => handleDelete(selectedLeague)}>
                  <i className="fa-solid fa-trash" />
                </button>
              : <button className="btn btn-sm btn-outline" style={{ fontSize: 11 }}
                  onClick={() => handleLeave(selectedLeague)}>
                  {lang === 'es' ? 'Salir' : 'Leave'}
                </button>
            }
          </div>
        </div>
      </div>

{/* League champions */}
<LeagueChampionsBanner token={token} leagueId={selectedLeague.id} lang={lang} />

{viewingMember && (
  <MemberPredictionsModal
    token={token}
    lang={lang}
    leagueId={selectedLeague.id}
    userId={viewingMember.userId}
    alias={viewingMember.alias}
    onClose={() => setViewingMember(null)}
  />
)}

{!leagueBoard
  ? [1,2,3].map(i => <div key={i} className="skeleton mb-6" style={{ height: 56, borderRadius: 10 }} />)
  : leagueBoard.leaderboard?.map((entry, idx) => (
      <div key={entry.alias} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', borderRadius: 10, marginBottom: 6,
        background: entry.is_me ? 'rgba(240,180,41,0.08)' : 'var(--card2)',
        border: entry.is_me ? '1px solid rgba(240,180,41,0.25)' : '1px solid rgba(255,255,255,0.04)',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 13,
          background: entry.rank <= 3 ? ['#f0b429','#94a3b8','#cd7f32'][entry.rank-1] : 'rgba(255,255,255,0.06)',
          color: entry.rank <= 3 ? '#0a0e1a' : 'var(--text3)',
        }}>{entry.rank}</div>
        <Avatar alias={entry.alias} color={entry.avatar_color} size={32} />
<div style={{ flex: 1, minWidth: 0 }}>
  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)',
    display: 'flex', alignItems: 'center', gap: 4 }}>
    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {entry.alias}
    </span>
    {entry.is_me && <span style={{ fontSize: 10, color: 'var(--gold)', flexShrink: 0 }}>({lang === 'es' ? 'yo' : 'me'})</span>}
    {!entry.is_me && (
      <button
        onClick={() => setViewingMember({ userId: entry.user_id, alias: entry.alias })}
        style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 12, padding: '0 2px', flexShrink: 0 }}
        title={lang === 'es' ? 'Ver predicciones' : 'View predictions'}
      >
        <i className="fa-solid fa-eye" />
      </button>
    )}
  </div>
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>
            <i className="fa-solid fa-check" style={{ marginRight: 3 }} />{entry.correct_winners}{' '}
            <i className="fa-solid fa-bullseye" style={{ marginRight: 3, marginLeft: 6 }} />{entry.correct_scores}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--gold)', lineHeight: 1 }}>{entry.total_points}</div>
            <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase' }}>pts</div>
          </div>
        </div>
      </div>
    ))
}
    </div>
  )

  // List view
  return (
    <div>
      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className="btn btn-gold btn-sm" style={{ flex: 1 }}
          onClick={() => { setShowCreate(true); setShowJoin(false); setActionError('') }}>
          <i className="fa-solid fa-plus" style={{ marginRight: 6 }} />
          {lang === 'es' ? 'Crear quiniela' : 'Create league'}
        </button>
        <button className="btn btn-outline btn-sm" style={{ flex: 1 }}
          onClick={() => { setShowJoin(true); setShowCreate(false); setActionError('') }}>
          <i className="fa-solid fa-right-to-bracket" style={{ marginRight: 6 }} />
          {lang === 'es' ? 'Unirme con código' : 'Join with code'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card mb-16">
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
            {lang === 'es' ? 'Nueva quiniela privada' : 'New private league'}
          </h4>
          <input
            type="text"
            placeholder={lang === 'es' ? 'Nombre de la quiniela' : 'League name'}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            maxLength={80}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 8, marginBottom: 10,
              background: 'var(--card2)', border: '1px solid var(--border)',
              color: 'var(--text)', fontSize: 13, boxSizing: 'border-box',
            }}
          />
          {actionError && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{actionError}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-gold btn-sm" onClick={handleCreate} disabled={creating} style={{ flex: 1 }}>
              {creating ? <i className="fa-solid fa-spinner fa-spin" /> : (lang === 'es' ? 'Crear' : 'Create')}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)} style={{ flex: 1 }}>
              {lang === 'es' ? 'Cancelar' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Join form */}
      {showJoin && (
        <div className="card mb-16">
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
            {lang === 'es' ? 'Unirme a una quiniela' : 'Join a league'}
          </h4>
          <input
            type="text"
            placeholder={lang === 'es' ? 'Código de invitación' : 'Invite code'}
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            maxLength={10}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 8, marginBottom: 10,
              background: 'var(--card2)', border: '1px solid var(--border)',
              color: 'var(--text)', fontSize: 14, letterSpacing: 2, fontWeight: 700,
              boxSizing: 'border-box',
            }}
          />
          {actionError && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{actionError}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-gold btn-sm" onClick={handleJoin} disabled={joining} style={{ flex: 1 }}>
              {joining ? <i className="fa-solid fa-spinner fa-spin" /> : (lang === 'es' ? 'Unirme' : 'Join')}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowJoin(false)} style={{ flex: 1 }}>
              {lang === 'es' ? 'Cancelar' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* League list */}
      {loading
        ? [1,2].map(i => <div key={i} className="skeleton mb-8" style={{ height: 64, borderRadius: 10 }} />)
        : !leagues.length
          ? <div className="card" style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text3)' }}>
              <i className="fa-solid fa-users" style={{ fontSize: 28, marginBottom: 10, display: 'block' }} />
              {lang === 'es' ? 'No estás en ninguna quiniela privada aún.' : "You haven't joined any private league yet."}
            </div>
          : leagues.map(league => (
            <button key={league.id}
              className="card"
              style={{ width: '100%', textAlign: 'left', cursor: 'pointer', marginBottom: 8,
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}
              onClick={() => openLeague(league)}
            >
              <i className="fa-solid fa-users" style={{ fontSize: 18, color: 'var(--gold)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {league.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  {league.member_count} {lang === 'es' ? 'participantes' : 'participants'}
                  {league.owner_id === userId && (
                    <span style={{ marginLeft: 8, color: 'var(--gold)' }}>
                      · {lang === 'es' ? 'Admin' : 'Admin'}
                    </span>
                  )}
                </div>
              </div>
              <i className="fa-solid fa-chevron-right" style={{ color: 'var(--text3)', fontSize: 12 }} />
            </button>
          ))
      }
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────
export default function Quiniela() {
  const { lang }                        = useLang()
  const { user, token, authLoading, openAuthModal } = useAuth()
  const navigate                        = useNavigate()

  const [profile,     setProfile]     = useState(undefined) // undefined = loading
  const [predictions, setPredictions] = useState([])
  const [activeTab,   setActiveTab]   = useState('predict')
  const [editingAlias, setEditingAlias] = useState(false)
  const [newAlias,     setNewAlias]     = useState("")
  const [newColor,     setNewColor]     = useState("")
  const [editError,    setEditError]    = useState("")
  const [editSaving,   setEditSaving]   = useState(false)

  const tabs = [
    { key: 'predict',  label: lang === 'es' ? 'Predecir'   : 'Predict',   icon: 'fa-solid fa-pen-to-square' },
    { key: 'history',  label: lang === 'es' ? 'Mis predicciones' : 'My predictions', icon: 'fa-solid fa-clock-rotate-left' },
    { key: 'global',   label: lang === 'es' ? 'Global'     : 'Global',    icon: 'fa-solid fa-ranking-star'  },
    { key: 'leagues',  label: lang === 'es' ? 'Mis ligas'  : 'My leagues', icon: 'fa-solid fa-users'        },
  ]

  const loadProfile = useCallback(async () => {
    if (!token) return
    try {
      const res = await getQuinielaProfile(token)
      setProfile(res.profile)
    } catch { setProfile(null) }
  }, [token])

  const loadPredictions = useCallback(async () => {
    if (!token || !profile) return
    try {
      const res = await getMyPredictions(token)
      setPredictions(res.predictions || [])
    } catch {}
  }, [token, profile])

  useEffect(() => { loadProfile() },     [loadProfile])
  useEffect(() => { loadPredictions() }, [loadPredictions])

  // ── Auth gate ──
  if (authLoading) return null

  if (!user) return (
    <div className="page-content page-enter" style={{ textAlign: 'center', padding: '80px 24px' }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}><i className="fa-solid fa-trophy" style={{ fontSize: 52, color: "var(--gold)" }} /></div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>
        {lang === 'es' ? 'Inicia sesión para jugar' : 'Sign in to play'}
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 28, lineHeight: 1.6 }}>
        {lang === 'es'
          ? 'Predice los resultados, acumula puntos y compite con amigos.'
          : 'Predict results, earn points and compete with friends.'}
      </p>
      <button className="btn btn-gold" onClick={() => openAuthModal('signin')}>
        <i className="fa-solid fa-right-to-bracket" />
        {lang === 'es' ? 'Iniciar sesión' : 'Sign In'}
      </button>
    </div>
  )

  // ── Profile loading ──
  if (profile === undefined) return (
    <div className="page-content">
      <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
    </div>
  )

  // ── First time — setup profile ──
  if (profile === null) return (
    <SetupProfile token={token} lang={lang} onSaved={(p) => setProfile(p)} />
  )

  // ── Main quiniela ──
  return (
    <div className="page-content page-enter">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Avatar alias={profile.alias} color={profile.avatar_color} size={44} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
  <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{profile.alias}</span>
  <button
    onClick={() => { setEditingAlias(true); setNewAlias(profile.alias); setNewColor(profile.avatar_color) }}
    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 11, padding: '2px 4px' }}
    title={lang === 'es' ? 'Editar alias' : 'Edit alias'}
  >
    <i className="fa-solid fa-pen-to-square" />
  </button>
</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>
            <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{profile.total_points} pts</span>
            {' · '}
            {profile.predictions_count} {lang === 'es' ? 'predicciones' : 'predictions'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1 }}>
            {lang === 'es' ? 'Exactos' : 'Exact'}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--green)' }}>
            {profile.correct_scores}
          </div>
        </div>
      </div>

{/* Edit alias form */}
{editingAlias && (
  <div className="card mb-16" style={{ padding: '14px 16px' }}>
    <input
      type="text"
      value={newAlias}
      onChange={e => setNewAlias(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
      maxLength={30}
      autoFocus
      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, marginBottom: 10,
        background: 'var(--card2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 15, boxSizing: 'border-box' }}
    />
    {editError && <p style={{ color: 'var(--red)', fontSize: 11, marginBottom: 8 }}>{editError}</p>}
    <div style={{ display: 'flex', gap: 8 }}>
      <button className="btn btn-gold btn-sm" style={{ flex: 1 }} disabled={editSaving}
        onClick={async () => {
          const trimmed = newAlias.trim()
          if (trimmed.length < 3) return setEditError(lang === 'es' ? 'Mínimo 3 caracteres' : 'Min 3 chars')
          setEditSaving(true); setEditError('')
          try {
            const res = await saveQuinielaProfile(token, { alias: trimmed, avatar_color: newColor })
            setProfile(res.profile); setEditingAlias(false)
          } catch (e) {
            setEditError(e.message?.includes('taken') ? (lang === 'es' ? 'Alias ya tomado' : 'Alias taken') : e.message)
          } finally { setEditSaving(false) }
        }}>
        {editSaving ? <i className="fa-solid fa-spinner fa-spin" /> : (lang === 'es' ? 'Guardar' : 'Save')}
      </button>
      <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}
        onClick={() => { setEditingAlias(false); setEditError('') }}>
        {lang === 'es' ? 'Cancelar' : 'Cancel'}
      </button>
    </div>
  </div>
)}

{/* Champions banner — hide when viewing a specific private league */}
{activeTab !== 'leagues' && <ChampionsBanner lang={lang} />}

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`tab${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <i className={tab.icon} style={{ marginRight: 6 }} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
{activeTab === 'predict' && (
  <div className="card mb-16" style={{
    background: 'linear-gradient(135deg, rgba(240,180,41,0.06), rgba(240,180,41,0.02))',
    border: '1px solid rgba(240,180,41,0.15)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <i className="fa-solid fa-circle-info" style={{ color: 'var(--gold)', fontSize: 16 }} />
      <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--text)' }}>
        {lang === 'es' ? '¿Cómo funciona la quiniela?' : 'How does the quiniela work?'}
      </h3>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[
        {
          icon: 'fa-pen-to-square',
          text: lang === 'es'
            ? 'Predice el marcador exacto de cada partido antes de que empiece.'
            : 'Predict the exact score of each match before it starts.',
        },
        {
          icon: 'fa-lock',
          text: lang === 'es'
            ? 'Una vez que el partido inicia, tu predicción se bloquea y no puede modificarse.'
            : 'Once the match starts, your prediction is locked and cannot be changed.',
        },
        {
          icon: 'fa-trophy',
          text: lang === 'es'
            ? 'Ganador o empate correcto = 3 pts. Marcador exacto = 5 pts.'
            : 'Correct winner or draw = 3 pts. Exact score = 5 pts.',
        },
        {
          icon: 'fa-crown',
          text: lang === 'es'
            ? 'Se premiará al campeón de fase de grupos, al de eliminatorias y al campeón general.'
            : 'Champions will be awarded for group stage, knockout phase and overall.',
        },
        {
          icon: 'fa-users',
          text: lang === 'es'
            ? 'Crea ligas privadas con amigos usando un código de invitación.'
            : 'Create private leagues with friends using an invite code.',
        },
      ].map(({ icon, text }) => (
        <div key={icon} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <i className={`fa-solid ${icon}`} style={{ color: 'var(--gold)', fontSize: 13, marginTop: 2, flexShrink: 0, width: 16, textAlign: 'center' }} />
          <span style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.5 }}>{text}</span>
        </div>
      ))}
    </div>
  </div>
)}

{activeTab === 'predict' && (
  <PredictTab
          token={token}
          lang={lang}
          predictions={predictions}
          onPredictionSaved={loadPredictions}
        />
      )}
      {activeTab === 'history' && (
        <MyPredictionsTab predictions={predictions} lang={lang} />
      )}
      {activeTab === 'global' && (
        <GlobalTab token={token} lang={lang} myProfile={profile} />
      )}
      {activeTab === 'leagues' && (
        <LeaguesTab token={token} lang={lang} userId={user.id} />
      )}
    </div>
  )
}