import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { useApp } from '../context/AppContext'
import { useApiPolling, useApi } from '../hooks/useApi'
import { getLiveMatches, getMatchStats, getMatchEvents, getCoach, getHeadToHead, TEAM_ISO } from '../services/sportsService'
import { MATCHES } from '../data/mockData'

// ─── Dual-color stat bar (gold=home · blue=away) ────────
function StatBar({ label, v1, v2, unit = '' }) {
  const total = (v1 || 0) + (v2 || 0)
  const pct   = total ? Math.round((v1 || 0) / total * 100) : 50
  return (
    <div className="stat-bar">
      <div className="stat-bar-header">
        <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{v1}{unit}</span>
        <span style={{ color: 'var(--text3)', fontSize: 11, textAlign: 'center' }}>{label}</span>
        <span style={{ color: 'var(--blue)', fontWeight: 700 }}>{v2}{unit}</span>
      </div>
      <div style={{
        height: 5, borderRadius: 3, overflow: 'hidden',
        display: 'flex', background: 'rgba(255,255,255,0.06)',
      }}>
        <div style={{
          width: `${pct}%`, background: 'var(--gold-grad)',
          borderRadius: '3px 0 0 3px', transition: 'width 0.9s ease',
          minWidth: pct > 0 ? 3 : 0,
        }} />
        <div style={{
          flex: 1, background: 'rgba(59,130,246,0.55)',
          borderRadius: '0 3px 3px 0', transition: 'width 0.9s ease',
          minWidth: pct < 100 ? 3 : 0,
        }} />
      </div>
    </div>
  )
}

// ─── Flag: handles URL logo and emoji ──────────────────
function TeamFlag({ flag, name, size = 64 }) {
  if (!flag) return (
    <div style={{ fontSize: size, marginBottom: 8 }} aria-hidden="true">🏳️</div>
  )
  if (typeof flag === 'string' && flag.startsWith('http')) {
    return (
      <img src={flag} alt={name}
        style={{ width: size, height: size, objectFit: 'contain', marginBottom: 8 }}
        onError={e => { e.target.style.display = 'none' }}
      />
    )
  }
  return (
    <div style={{ fontSize: size, marginBottom: 8, lineHeight: 1 }} aria-hidden="true">{flag}</div>
  )
}

// ─── Event icon ─────────────────────────────────────────
function eventIcon(e) {
  if (e.type === 'Goal')  return '⚽'
  if (e.type === 'Card')  return e.detail?.toLowerCase().includes('yellow') ? '🟨' : '🟥'
  if (e.type === 'subst') return '🔄'
  if (e.type === 'HT')    return '⏸️'
  if (e.type === 'VAR')   return '📺'
  return '•'
}

// ─── Parse elapsed minutes from "45'" → 45 ─────────────
function parseElapsed(timeStr) {
  if (!timeStr) return 0
  const m = timeStr.match(/(\d+)/)
  return m ? parseInt(m[1], 10) : 0
}

// ─── Main Component ────────────────────────────────────
export default function LiveMatch() {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const { state }    = useLocation()
  const { t, lang }  = useLang()
  const { toggleFav, isFav } = useApp()

  // ── Poll live matches every 30 s for live score/time updates ──
  const { data: liveMatches } = useApiPolling(getLiveMatches, 30_000)

  // ── Find this match in the live feed; fall back to nav state or mock ──
  const liveMatch = (liveMatches || []).find(m => m.id === Number(id))
  const match = liveMatch ?? state?.match ?? MATCHES.find(m => m.id === Number(id))

  // ── Poll stats every 60 s ────────────────────────────
  const [stats,         setStats]         = useState(null)
  const [events,        setEvents]        = useState(null)
  const [loadingEvents, setLoadingEvents] = useState(true)

  const fetchStats = useCallback(() => {
    if (!id) return
    getMatchStats(Number(id)).then(s => setStats(s)).catch(() => {})
  }, [id])

  const fetchEvents = useCallback(() => {
    if (!id) return
    getMatchEvents(Number(id))
      .then(evts => { setEvents(evts || []); setLoadingEvents(false) })
      .catch(() => setLoadingEvents(false))
  }, [id])

  useEffect(() => {
    fetchStats()
    fetchEvents()
    const statsTimer  = setInterval(fetchStats,  60_000)
    const eventsTimer = setInterval(fetchEvents, 30_000)
    return () => { clearInterval(statsTimer); clearInterval(eventsTimer) }
  }, [fetchStats, fetchEvents])

  // ── 404 ─────────────────────────────────────────────
  if (!match) return (
    <div className="page-content" style={{ textAlign: 'center', padding: '80px 0' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
      <h2>{t('match', 'not_found')}</h2>
      <button className="btn btn-outline mt-16" onClick={() => navigate('/matches')}>
        ← {t('common', 'back')}
      </button>
    </div>
  )

  const { team1, flag1, team2, flag2, score1, score2, status, time, group, venue, stadium, referee, team1Id, team2Id } = match

  const { data: coach1 } = useApi(getCoach, team1Id, { ttl: 86_400_000, skip: !team1Id })
  const { data: coach2 } = useApi(getCoach, team2Id, { ttl: 86_400_000, skip: !team2Id })

  const h2hKey = team1Id && team2Id ? `${team1Id}-${team2Id}` : null
  const { data: h2h, loading: h2hLoad } = useApi(
    () => getHeadToHead(team1Id, team2Id, 5),
    h2hKey,
    { skip: !h2hKey, ttl: 86_400_000 }
  )
  const isLive = status === 'live'
  const isFT   = status === 'ft'

  // Sort events newest-first (highest elapsed minute first)
  const sortedEvents = [...(events || [])].sort(
    (a, b) => parseElapsed(b.time) - parseElapsed(a.time)
  )

  return (
    <div className="page-content page-enter">
      <button className="btn btn-ghost btn-sm mb-24" onClick={() => navigate(-1)}>
        ← {t('common', 'back')}
      </button>

      {/* ── Live score card ── */}
      <div className="card mb-16">
        {/* Status row */}
        <div className="flex-between mb-16">
          <span className="badge badge-gold">{group || '—'}</span>
          {isLive ? (
            <div className="flex-center gap-6"
              style={{ color: 'var(--red)', fontWeight: 700, fontSize: 13 }}>
              <i className="fa-solid fa-circle" style={{ fontSize: 7, color: 'var(--red)', marginRight: 2 }} aria-hidden="true" />
              {t('common', 'live')} {time}
            </div>
          ) : isFT ? (
            <span className="badge badge-gray">{t('common', 'full_time')}</span>
          ) : (
            <span className="badge badge-electric">{time}</span>
          )}
        </div>

        {/* Teams + scoreline */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 20,
          textAlign: 'center', marginBottom: 16,
        }}>
          {/* Home */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <TeamFlag flag={flag1} name={team1} size={52} />
            <h2 className="fw-600" style={{ fontSize: 'clamp(12px, 3.5vw, 18px)', lineHeight: 1.3, overflowWrap: 'break-word', wordBreak: 'break-word' }}>{team1}</h2>
          </div>

          {/* Score */}
          <div style={{ flexShrink: 0, textAlign: 'center' }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(36px, 14vw, 64px)', letterSpacing: 'clamp(2px, 1.5vw, 6px)', lineHeight: 1, marginBottom: 4,
            }}>
              <span style={{ color: score1 > score2 ? 'var(--gold)' : 'var(--text)' }}>
                {score1 ?? 0}
              </span>
              <span style={{ color: 'var(--text3)', margin: '0 4px' }}>–</span>
              <span style={{ color: score2 > score1 ? 'var(--gold)' : 'var(--text)' }}>
                {score2 ?? 0}
              </span>
            </div>
            {(venue || stadium) && (
              <div className="caption" style={{ fontSize: 11, marginTop: 4 }}>
                {[venue, stadium].filter(Boolean).join(' · ')}
              </div>
            )}
            {referee && (
              <div className="caption" style={{ fontSize: 10, marginTop: 4, color: 'var(--text3)' }}>
                <i className="fa-solid fa-whistle" style={{ marginRight: 4, opacity: 0.6 }} aria-hidden="true" />
                {referee}
              </div>
            )}
          </div>

          {/* Away */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <TeamFlag flag={flag2} name={team2} size={52} />
            <h2 className="fw-600" style={{ fontSize: 'clamp(12px, 3.5vw, 18px)', lineHeight: 1.3, overflowWrap: 'break-word', wordBreak: 'break-word' }}>{team2}</h2>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-8 flex-wrap" style={{ justifyContent: 'center' }}>
          <button
            className={`btn btn-sm ${isFav('matches', match.id) ? 'btn-gold' : 'btn-outline'}`}
            onClick={() => toggleFav('matches', { ...match, name: `${team1} vs ${team2}` })}
          >
            {isFav('matches', match.id) ? t('match', 'saved') : t('match', 'save')}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate(`/matches/${id}`, { state: { match } })}
          >
            {lang === 'es' ? 'Ver detalle completo' : 'Full match detail'}
          </button>
        </div>
      </div>

      {/* ── Stats + Timeline ── */}
      <div className="grid-2 mb-16">

        {/* Statistics */}
        <div className="card">
          <h3 className="fw-600 mb-12" style={{ fontSize: 15 }}>
            {t('match', 'statistics')}
          </h3>
          {stats ? (
            <>
              <div className="flex-between mb-16" style={{ fontSize: 11, fontWeight: 700 }}>
                <span style={{ color: 'var(--gold)' }}>{team1}</span>
                <span style={{ color: 'var(--text3)', fontWeight: 400, fontSize: 10 }}>vs</span>
                <span style={{ color: 'var(--blue)' }}>{team2}</span>
              </div>
              <StatBar label={lang === 'es' ? 'Posesión'  : 'Possession'}  v1={stats.possession?.home}    v2={stats.possession?.away}    unit="%" />
              <StatBar label={lang === 'es' ? 'Tiros'     : 'Shots'}       v1={stats.shots?.home}         v2={stats.shots?.away} />
              <StatBar label={lang === 'es' ? 'A puerta'  : 'On Target'}   v1={stats.shotsOnTarget?.home} v2={stats.shotsOnTarget?.away} />
              <StatBar label={lang === 'es' ? 'Córners'   : 'Corners'}     v1={stats.corners?.home}       v2={stats.corners?.away} />
              <StatBar label={lang === 'es' ? 'Faltas'    : 'Fouls'}       v1={stats.fouls?.home}         v2={stats.fouls?.away} />
              <StatBar label={lang === 'es' ? 'T. amarillas' : 'Yellow Cards'} v1={stats.yellowCards?.home} v2={stats.yellowCards?.away} />
              {(stats.xg?.home || stats.xg?.away) && (
                <StatBar label="xG" v1={stats.xg?.home} v2={stats.xg?.away} />
              )}
            </>
          ) : (
            <div className="caption" style={{ color: 'var(--text3)', padding: '20px 0', textAlign: 'center' }}>
              {lang === 'es' ? 'Cargando estadísticas…' : 'Loading stats…'}
            </div>
          )}
        </div>

        {/* Events timeline — newest-first */}
        <div className="card">
          <h3 className="fw-600 mb-12" style={{ fontSize: 15 }}>
            {t('match', 'timeline')}
          </h3>
          {loadingEvents ? (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '24px 0' }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton" style={{ width: 8, height: 8, borderRadius: '50%' }} />
              ))}
            </div>
          ) : !sortedEvents.length ? (
            <div className="caption" style={{ color: 'var(--text3)', padding: '24px 0', textAlign: 'center' }}>
              {t('match', 'no_events')}
            </div>
          ) : (
            <div role="list">
              {sortedEvents.map((e, i) => (
                <div key={i} className="timeline-item" role="listitem">
                  <div className="timeline-time">{e.time}</div>
                  <div className="timeline-icon">{eventIcon(e)}</div>
                  <div className="timeline-desc">
                    <span>{e.detail}</span>
                    {e.player && (
                      <span style={{ fontWeight: 600, marginLeft: 4 }}>— {e.player}</span>
                    )}
                    {e.team && (
                      <div className="caption" style={{ marginTop: 2 }}>{e.team}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>


      {/* ── Head to Head ── */}
      {(h2hLoad || (h2h && h2h.length > 0)) && (
        <div className="card mb-16">
          <h3 className="fw-600 mb-16" style={{ fontSize: 15 }}>
            <i className="fa-solid fa-shield-halved" style={{ marginRight: 8, color: 'var(--gold)' }} aria-hidden="true" />
            {lang === 'es' ? 'Historial de enfrentamientos' : 'Head to Head'}
          </h3>
          {h2hLoad ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 36, borderRadius: 6 }} />)}
            </div>
          ) : (
            <>
              {(() => {
                const t1Wins = h2h.filter(m => m.winner === team1).length
                const t2Wins = h2h.filter(m => m.winner === team2).length
                const draws  = h2h.filter(m => m.winner === 'Draw').length
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                    {[
                      { label: team1, val: t1Wins, color: 'var(--gold)' },
                      { label: lang === 'es' ? 'Empates' : 'Draws', val: draws, color: 'var(--text3)' },
                      { label: team2, val: t2Wins, color: 'var(--electric)' },
                    ].map(({ label, val, color }) => (
                      <div key={label} style={{ textAlign: 'center', background: 'var(--card2)', borderRadius: 8, padding: '10px 8px', border: '0.5px solid var(--border)' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color, lineHeight: 1, marginBottom: 4 }}>{val}</div>
                        <div className="caption" style={{ fontSize: 10, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
                      </div>
                    ))}
                  </div>
                )
              })()}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {h2h.map((m, i) => {
                  const isT1Win = m.winner === team1
                  const isT2Win = m.winner === team2
                  const isDraw  = m.winner === 'Draw'
                  const year    = m.date ? new Date(m.date).getFullYear() : ''
                  return (
                    <div key={m.id || i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'var(--card2)', border: '0.5px solid var(--border)' }}>
                      <span className="caption" style={{ fontSize: 10, color: 'var(--text3)', flexShrink: 0, minWidth: 32 }}>{year}</span>
                      <span style={{ flex: 1, fontSize: 12, textAlign: 'right', fontWeight: isT1Win ? 700 : 400, color: isT1Win ? 'var(--gold)' : 'var(--text)' }}>{m.home}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, flexShrink: 0, minWidth: 48, textAlign: 'center', color: isDraw ? 'var(--text3)' : isT1Win ? 'var(--gold)' : 'var(--electric)' }}>{m.score ?? 'vs'}</span>
                      <span style={{ flex: 1, fontSize: 12, textAlign: 'left', fontWeight: isT2Win ? 700 : 400, color: isT2Win ? 'var(--electric)' : 'var(--text)' }}>{m.away}</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Coaches ── */}
      {(coach1 || coach2) && (
        <div className="card mb-16">
          <h3 className="fw-600 mb-16" style={{ fontSize: 15 }}>
            <i className="fa-solid fa-person-chalkboard" style={{ color: 'var(--gold)', marginRight: 8 }} aria-hidden="true" />
            {lang === 'es' ? 'Directores Técnicos' : 'Head Coaches'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[{ coach: coach1, team: team1, flag: flag1 }, { coach: coach2, team: team2, flag: flag2 }].map(({ coach, team, flag }, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '12px 8px', background: 'var(--card2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                {coach?.photo ? (
                  <img src={coach.photo} alt={coach.name}
                    style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }}
                    onError={e => { e.target.style.display = 'none' }}
                  />
                ) : (
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="fa-solid fa-user" style={{ fontSize: 22, color: 'var(--text3)' }} aria-hidden="true" />
                  </div>
                )}
                <div style={{ textAlign: 'center', minWidth: 0 }}>
                  <div className="fw-600" style={{ fontSize: 12, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {coach?.name || '—'}
                  </div>
                  <div className="caption" style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
                    {coach?.nationality || ''}
                  </div>
                  <div className="caption" style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
                    {team}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Full time banner ── */}
      {isFT && (
        <div className="card" style={{
          textAlign: 'center', padding: '28px 20px',
          border: '1px solid rgba(240,180,41,0.2)',
        }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏁</div>
          <h3 className="fw-600 mb-8" style={{ fontSize: 18 }}>{t('common', 'full_time')}</h3>
          <p className="caption mb-16">
            {lang === 'es' ? 'El partido ha finalizado.' : 'The match has ended.'}
          </p>
          <button
            className="btn btn-gold"
            onClick={() => navigate(`/matches/${id}`, { state: { match } })}
          >
            {lang === 'es' ? 'Ver estadísticas completas' : 'View Full Match Stats'}
          </button>
        </div>
      )}
    </div>
  )
}