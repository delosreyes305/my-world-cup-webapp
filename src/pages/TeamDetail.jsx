import React, { useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'
import { getTeams, getAllTeamPlayers, getTeamFixtures, getStandings, TEAM_METADATA, TEAM_ISO } from '../services/sportsService'

// ─── Sub-components ──────────────────────────────────

function TeamLogo({ flag, name, size = 80 }) {
  if (!flag) return (
    <div style={{ fontSize: size * 0.8, width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      🏳️
    </div>
  )
  if (typeof flag === 'string' && flag.startsWith('http')) {
    return (
      <img
        src={flag} alt={name}
        style={{ width: size, height: size, objectFit: 'contain', borderRadius: 6 }}
        onError={e => { e.target.style.display = 'none' }}
      />
    )
  }
  return <span style={{ fontSize: size * 0.8, lineHeight: 1 }} aria-hidden="true">{flag}</span>
}

function PlayerPhoto({ photo, emoji, size = 52 }) {
  if (photo) {
    return (
      <img src={photo} alt=""
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover',
          border: '2px solid rgba(240,180,41,0.2)' }}
        onError={e => { e.target.style.display = 'none' }}
      />
    )
  }
  return (
    <div style={{ fontSize: size * 0.5, width: size, height: size, borderRadius: '50%',
      background: 'rgba(240,180,41,0.08)', border: '2px solid rgba(240,180,41,0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {emoji || '⭐'}
    </div>
  )
}

function MatchFlag({ flag, name }) {
  if (!flag) return null
  if (typeof flag === 'string' && flag.startsWith('http')) {
    return (
      <img src={flag} alt={name}
        style={{ width: 20, height: 20, objectFit: 'contain', verticalAlign: 'middle', borderRadius: 2 }}
        onError={e => { e.target.style.display = 'none' }}
      />
    )
  }
  return <span style={{ fontSize: 16 }}>{flag}</span>
}

const POS_COLOR = { FW: 'var(--red)', MF: 'var(--blue)', DF: 'var(--green)', GK: 'var(--gold)' }

// ─── Main Component ──────────────────────────────────

export default function TeamDetail() {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const { state }    = useLocation()
  const { t, lang }  = useLang()
  const { toggleFav, isFav } = useApp()
  const { user, authLoading, openAuthModal } = useAuth()

  // Resolve team: navigation state (fast path) or fall back to teams list (direct URL)
  const { data: teams } = useApi(getTeams, { ttl: 3_600_000 })
  const team = state?.team ?? teams?.find(tm => tm.id === Number(id))

  // Load squad, fixtures, standings – all cached 1 h
  const { data: squad,    loading: squadLoad    } = useApi(getAllTeamPlayers, team?.id, { ttl: 3_600_000, skip: !team })
  const { data: fixtures, loading: fixtureLoad  } = useApi(getTeamFixtures,  team?.id, { ttl: 1_800_000, skip: !team })
  const { data: standings }                        = useApi(getStandings, { ttl: 3_600_000 })

  // Find this team's group in the standings object
  const [groupLetter, groupRows] = useMemo(() => {
    if (!standings || !team) return [null, null]
    const entry = Object.entries(standings).find(([, rows]) =>
      rows.some(r => r.name === team.name)
    )
    return entry ?? [null, null]
  }, [standings, team])

  // Guaranteed rank/titles: team object first, then static map as fallback.
  // Use || (not ??) so that 0 also falls through to the metadata lookup.
  const meta   = TEAM_METADATA[team?.name] || {}
  const rank   = team?.rank   || meta.rank   || null
  const titles = team?.titles || meta.titles || 0

  // Key Players: top 4 by rating descending (hook must stay before early returns)
  const topPlayers = useMemo(() => {
    if (!squad?.length) return []
    return [...squad]
      .sort((a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0))
      .slice(0, 4)
  }, [squad])

  // ── Auth gate — wait for token validation before showing sign-in ──
  if (!user && !authLoading) return (
    <div className="page-content page-enter" style={{ textAlign: 'center', padding: '80px 24px' }}>
      <div style={{ position: 'relative', display: 'inline-flex', justifyContent: 'center', marginBottom: 20 }}>
        <i className="fa-regular fa-shield-halved" style={{ fontSize: 52, color: 'var(--gold)', opacity: 0.85 }} />
        <span style={{
          position: 'absolute', bottom: -4, right: -10,
          background: 'var(--card)', borderRadius: '50%', padding: '4px 5px', lineHeight: 1,
          border: '1px solid rgba(240,180,41,0.2)',
        }}>
          <i className="fa-solid fa-lock" style={{ fontSize: 16, color: 'var(--gold)' }} />
        </span>
      </div>
      <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
        {lang === 'es' ? 'Inicia sesión para ver los detalles' : 'Sign in to view details'}
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.55, marginBottom: 28 }}>
        {lang === 'es'
          ? 'Crea una cuenta o inicia sesión para explorar equipos, jugadores y partidos.'
          : 'Create an account or sign in to explore teams, players and matches.'}
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-gold" onClick={() => openAuthModal('signin')}>
          <i className="fa-solid fa-right-to-bracket" />
          {lang === 'es' ? 'Iniciar sesión' : 'Sign In'}
        </button>
        <button className="btn btn-outline" onClick={() => navigate(-1)}>
          ← {t('common', 'back')}
        </button>
      </div>
    </div>
  )

  // ── Loading skeleton while teams list is still loading ──
  if (!team && !teams) {
    return (
      <div className="page-content page-enter">
        <div className="skeleton mb-24" style={{ width: 80, height: 32, borderRadius: 8 }} />
        <div className="skeleton mb-16" style={{ height: 200, borderRadius: 'var(--radius)' }} />
        <div className="grid-4 mb-16">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--radius)' }} />
          ))}
        </div>
      </div>
    )
  }

  // ── 404 ──
  if (!team) return (
    <div className="page-content" style={{ textAlign: 'center', padding: '80px 0' }}>
      <h2>{lang === 'es' ? 'Equipo no encontrado' : 'Team not found'}</h2>
      <button className="btn btn-outline mt-16" onClick={() => navigate('/teams')}>
        ← {t('common','back')}
      </button>
    </div>
  )

  return (
    <div className="page-content page-enter">
      <button className="btn btn-ghost btn-sm mb-24" onClick={() => navigate('/teams')}>
        ← {t('common','back')}
      </button>

      {/* ── Header ── */}
      <div className="card mb-16" style={{ padding: 0, overflow: 'hidden' }}>

        {/* Banner */}
        <div style={{
          height: 35,
          background: 'linear-gradient(135deg, #0a1628 0%, #1a2d4a 60%, #0f2040 100%)',
          position: 'relative',
          flexShrink: 0,
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(240,180,41,0.03) 20px, rgba(240,180,41,0.03) 40px)',
          }} />
        </div>

        <div style={{ padding: '0 16px 16px' }}>
          {/* Flag + badges row */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
            {/* Flag overlapping banner */}
            {(() => {
              const iso = TEAM_ISO[team.name]
              return (
                <div style={{
                  width: 90, height: 60, borderRadius: 8,
                  border: '2.5px solid var(--card)',
                  marginTop: 28, flexShrink: 0,
                  overflow: 'hidden', background: '#0a1628',
                }}>
                  {iso
                    ? <img
                        src={`https://flagcdn.com/w160/${iso}.png`}
                        alt={team.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    : team.flag && typeof team.flag === 'string' && team.flag.startsWith('http')
                      ? <img
                          src={team.flag}
                          alt={team.name}
                          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', padding: 6 }}
                          onError={e => { e.target.style.display = 'none' }}
                        />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🏳️</div>
                  }
                </div>
              )
            })()}

            {/* Badges */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', paddingBottom: 2 }}>
              {team.confederation && (
                <span className="badge" style={{
                  fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 20,
                  background: 'rgba(240,180,41,0.12)', color: 'var(--gold)',
                  border: '0.5px solid rgba(240,180,41,0.3)',
                }}>
                  {team.confederation}
                </span>
              )}
              {groupLetter && (
                <span className="badge" style={{
                  fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 20,
                  background: 'rgba(55,138,221,0.12)', color: 'var(--electric)',
                  border: '0.5px solid rgba(55,138,221,0.25)',
                }}>
                  {lang === 'es' ? 'Grupo' : 'Group'} {groupLetter}
                </span>
              )}
              {rank && (
                <span className="badge" style={{
                  fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 20,
                  background: 'rgba(29,158,117,0.1)', color: 'var(--green)',
                  border: '0.5px solid rgba(29,158,117,0.25)',
                }}>
                  #{rank} FIFA
                </span>
              )}
            </div>
          </div>

          {/* Name */}
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '10px 0 0' }}>
            {team.name}
          </h1>

          {/* Divider */}
          <div style={{ height: '0.5px', background: 'var(--border)', margin: '14px 0' }} />

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px 12px', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 500,
                cursor: 'pointer', border: isFav('teams', team.id) ? '0.5px solid rgba(240,180,41,0.4)' : '0.5px solid var(--border2)',
                background: isFav('teams', team.id) ? 'rgba(240,180,41,0.1)' : 'var(--card2)',
                color: isFav('teams', team.id) ? 'var(--gold)' : 'var(--text)',
              }}
              onClick={() => toggleFav('teams', team)}
            >
              <i className={`fa-${isFav('teams', team.id) ? 'solid' : 'regular'} fa-heart`} style={{ fontSize: 13 }} />
              {isFav('teams', team.id) ? t('common','favorited') : t('common','add_fav')}
            </button>
            <button
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px 12px', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 500,
                cursor: 'pointer', border: '0.5px solid var(--border2)',
                background: 'var(--card2)', color: 'var(--text)',
              }}
              onClick={() => navigate('/predict', { state: { preselect: team.id } })}
            >
              <i className="fa-solid fa-robot" style={{ fontSize: 13 }} />
              {lang === 'es' ? 'Predecir partido' : 'Predict Match'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8, marginBottom: 16 }}>
        {[
          { label: lang === 'es' ? 'Ranking FIFA' : 'FIFA Rank', val: rank != null ? `#${rank}` : '—' },
          { label: lang === 'es' ? 'Fundado'      : 'Founded',   val: team.founded || '—' },
          { label: lang === 'es' ? 'Títulos'      : 'WC Titles', val: titles > 0 ? `${titles}×` : '—' },
          { label: lang === 'es' ? 'Puntos'       : 'Group Pts', val: team.pts ?? (groupRows ? (groupRows.find(r => r.name === team.name)?.pts ?? '—') : '—') },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--card2)', borderRadius: 'var(--radius)',
            padding: '12px 16px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* ── Info + Matches ── */}
      <div className="grid-2 mb-16">

        {/* Team Info */}
        <div className="card">
          <h2 className="fw-600 mb-16" style={{ fontSize: 15 }}>
            {lang === 'es' ? 'Información del equipo' : 'Team Info'}
          </h2>

          {[
            { label: lang === 'es' ? 'Confederación'  : 'Confederation', val: team.confederation || '—' },
            { label: lang === 'es' ? 'Fundado'        : 'Founded',       val: team.founded || '—' },
            team.coach
              ? { label: lang === 'es' ? 'Técnico'   : 'Coach',          val: team.coach }
              : null,
            team.venue?.name
              ? { label: lang === 'es' ? 'Estadio'   : 'Home Venue',     val: team.venue.name }
              : null,
            team.venue?.city
              ? { label: lang === 'es' ? 'Ciudad'    : 'City',           val: team.venue.city }
              : null,
            team.venue?.capacity
              ? { label: lang === 'es' ? 'Capacidad' : 'Capacity',       val: Number(team.venue.capacity).toLocaleString() }
              : null,
          ].filter(Boolean).map(({ label, val }) => (
            <div key={label} className="flex-between" style={{ marginBottom: 10 }}>
              <span className="label" style={{ marginBottom: 0 }}>{label}</span>
              <span className="fw-600" style={{ maxWidth: '60%', textAlign: 'right' }}>{val}</span>
            </div>
          ))}

          {/* Recent Form (mock only — API doesn't return form) */}
          {team.form?.length > 0 && (
            <>
              <div className="divider" />
              <div className="label mb-8">{lang === 'es' ? 'Forma reciente' : 'Recent Form'}</div>
              <div className="flex gap-6">
                {team.form.map((f, i) => (
                  <div key={i}
                    className={`form-dot ${f.toLowerCase()}`}
                    style={{ width: 32, height: 32, fontSize: 12 }}
                    aria-label={f === 'W' ? 'Win' : f === 'D' ? 'Draw' : 'Loss'}>
                    {f}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Tournament Matches */}
        <div className="card">
          <h2 className="fw-600 mb-16" style={{ fontSize: 15 }}>
            {lang === 'es' ? 'Partidos del torneo' : 'Tournament Matches'}
          </h2>

          {fixtureLoad ? (
            <div>
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton mb-8" style={{ height: 54, borderRadius: 8 }} />
              ))}
            </div>
          ) : !fixtures?.length ? (
            <div className="caption" style={{ color: 'var(--text3)', textAlign: 'center', padding: '28px 0' }}>
              {lang === 'es' ? 'Partidos por confirmar' : 'Schedule TBD'}
            </div>
          ) : (
            fixtures.map(m => (
              <button
                key={m.id}
                className="card-sm mb-8"
                style={{
                  width: '100%', textAlign: 'left', cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.06)', display: 'block',
                }}
                onClick={() => m.status === 'live'
                  ? navigate(`/live/${m.id}`,    { state: { match: m } })
                  : navigate(`/matches/${m.id}`, { state: { match: m } })}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', flex: 1 }}>
                    <MatchFlag flag={m.flag1} name={m.team1} />
                    <span className="fw-600" style={{ color: 'var(--text)' }}>{m.team1}</span>
                    <span style={{ color: 'var(--text3)', margin: '0 4px' }}>
                      {m.score1 !== null && m.score2 !== null
                        ? `${m.score1}–${m.score2}`
                        : 'vs'}
                    </span>
                    <span className="fw-600" style={{ color: 'var(--text)' }}>{m.team2}</span>
                    <MatchFlag flag={m.flag2} name={m.team2} />
                  </div>
                  <span
                    className={`badge ${m.status === 'live' ? 'badge-red' : m.status === 'ft' ? 'badge-gray' : 'badge-electric'}`}
                    style={{ flexShrink: 0 }}>
                    {m.status === 'live' ? m.time : m.status === 'ft' ? 'FT' : m.time}
                  </span>
                </div>
                {(m.group || m.venue) && (
                  <div className="caption" style={{ fontSize: 10, marginTop: 4, color: 'var(--text3)' }}>
                    {[m.group, m.venue].filter(Boolean).join(' · ')}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Group Standings ── */}
      {groupLetter && groupRows && (
        <div className="card mb-16">
          <h2 className="fw-600 mb-16" style={{ fontSize: 15 }}>
            {lang === 'es'
              ? `Grupo ${groupLetter} — Clasificación`
              : `Group ${groupLetter} Standings`}
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" aria-label={`Group ${groupLetter} standings`}>
              <thead>
                <tr>
                  <th style={{ width: 28 }}>#</th>
                  <th>{lang === 'es' ? 'Equipo' : 'Team'}</th>
                  <th>MP</th><th>W</th><th>D</th><th>L</th><th>GD</th>
                  <th className="text-gold">Pts</th>
                </tr>
              </thead>
              <tbody>
                {groupRows.map((r, i) => {
                  const gd = r.gf - r.ga
                  const isThis = r.name === team.name
                  return (
                    <tr key={r.name} style={isThis ? { background: 'rgba(240,180,41,0.07)' } : {}}>
                      <td>
                        <div className={`standing-pos${i < 2 ? ' qualify' : ''}`}>{i + 1}</div>
                      </td>
                      <td>
                        {typeof r.flag === 'string' && r.flag.startsWith('http')
                          ? <img src={r.flag} alt="" style={{ width: 20, marginRight: 6, verticalAlign: 'middle' }} />
                          : <span style={{ marginRight: 6, fontSize: 16 }}>{r.flag}</span>
                        }
                        {isThis ? <strong>{r.name}</strong> : r.name}
                      </td>
                      <td>{r.mp}</td>
                      <td>{r.w}</td>
                      <td>{r.d}</td>
                      <td>{r.l}</td>
                      <td className={gd > 0 ? 'text-green' : gd < 0 ? 'text-red' : 'text-muted'}>
                        {gd > 0 ? '+' : ''}{gd}
                      </td>
                      <td className="text-gold fw-600">{r.pts}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Key Players ── */}
      <div className="card">
        <div className="flex-between mb-16">
          <h2 className="fw-600" style={{ fontSize: 15, margin: 0 }}>
            {lang === 'es' ? 'Jugadores destacados' : 'Key Players'}
          </h2>
          {squad && squad.length > 4 && (
            <button className="see-all"
              onClick={() => navigate('/players', { state: { country: team.name } })}>
              {lang === 'es'
                ? `Ver plantel (${squad.length})`
                : `Full squad (${squad.length})`} →
            </button>
          )}
        </div>

        {squadLoad ? (
          <div className="grid-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton" style={{ height: 150, borderRadius: 'var(--radius)' }} />
            ))}
          </div>
        ) : topPlayers.length === 0 ? (
          <div className="caption" style={{ color: 'var(--text3)', textAlign: 'center', padding: '28px 0' }}>
            {lang === 'es' ? 'Plantel no disponible' : 'Squad not available'}
          </div>
        ) : (
          <div className="grid-4">
            {topPlayers.map(p => (
              <button
                key={p.id}
                className="card-sm"
                style={{
                  textAlign: 'center', cursor: 'pointer', width: '100%',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
                onClick={() => navigate(`/players/${p.id}`, { state: { player: p } })}
                aria-label={`${p.name}, ${p.pos}`}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                  <PlayerPhoto photo={p.photo} emoji={p.emoji} size={52} />
                </div>
                <div className="fw-600" style={{ fontSize: 12, marginBottom: 4, lineHeight: 1.3, color: 'var(--text)' }}>
                  {p.name}
                </div>
                <div style={{ marginBottom: 6 }}>
                  <span className="badge" style={{
                    fontSize: 9,
                    background: `${POS_COLOR[p.pos] || 'var(--gold)'}22`,
                    color: POS_COLOR[p.pos] || 'var(--gold)',
                    border: `1px solid ${POS_COLOR[p.pos] || 'var(--gold)'}44`,
                  }}>
                    {p.pos}
                  </span>
                </div>
                {p.club && (
                  <div className="caption" style={{ fontSize: 10, marginBottom: 6, color: 'var(--text)' }}>
                    {p.club}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                  <div>
                    <div className="text-gold fw-600" style={{ fontSize: 14 }}>{p.goals}</div>
                    <div className="caption" style={{ fontSize: 9 }}>
                      {lang === 'es' ? 'Gls' : 'G'}
                    </div>
                  </div>
                  <div>
                    <div className="text-gold fw-600" style={{ fontSize: 14 }}>{p.assists}</div>
                    <div className="caption" style={{ fontSize: 9 }}>
                      {lang === 'es' ? 'Ast' : 'A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-gold fw-600" style={{ fontSize: 14 }}>{p.rating}</div>
                    <div className="caption" style={{ fontSize: 9 }}>Rtg</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}