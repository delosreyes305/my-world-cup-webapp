import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { useApp } from '../context/AppContext'
import { useApiPolling } from '../hooks/useApi'
import { getLiveMatches, getMatchStats, getMatchEvents } from '../services/sportsService'
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

  const { team1, flag1, team2, flag2, score1, score2, status, time, group, venue, stadium } = match
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
              <span className="live-dot" aria-hidden="true" />
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
          <div style={{ flex: 1 }}>
            <TeamFlag flag={flag1} name={team1} size={64} />
            <h2 className="fw-600" style={{ fontSize: 18, lineHeight: 1.3 }}>{team1}</h2>
          </div>

          {/* Score */}
          <div style={{ flexShrink: 0, textAlign: 'center' }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 64, letterSpacing: 6, lineHeight: 1, marginBottom: 4,
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
          </div>

          {/* Away */}
          <div style={{ flex: 1 }}>
            <TeamFlag flag={flag2} name={team2} size={64} />
            <h2 className="fw-600" style={{ fontSize: 18, lineHeight: 1.3 }}>{team2}</h2>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-8 flex-wrap">
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
