import React, { useMemo, useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'
import { getMatchStats, getMatchEvents, getTeams, getMatchPrediction, getMatchOdds, getHeadToHead, getAllFixtures } from '../services/sportsService'
import { getMatchHighlight } from '../services/youtubeService'
import YouTubeEmbed from '../components/common/YouTubeEmbed'
import { MATCHES, TEAMS } from '../data/mockData'
import ApiStatus from '../components/common/ApiStatus'

// ─── Dual-color stat bar (gold = home · blue = away) ───
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

// ─── Event icon (goal / yellow / red / sub / HT) ───────
function eventIcon(e) {
  if (e.type === 'Goal')  return <i className="fa-solid fa-futbol" style={{ color: 'var(--gold)', fontSize: 13 }} />
  if (e.type === 'Card')  return e.detail?.toLowerCase().includes('yellow')
    ? <i className="fa-solid fa-square" style={{ color: '#f0b429', fontSize: 13 }} />
    : <i className="fa-solid fa-square" style={{ color: 'var(--red)', fontSize: 13 }} />
  if (e.type === 'subst') return <i className="fa-solid fa-arrow-right-arrow-left" style={{ color: 'var(--electric)', fontSize: 12 }} />
  if (e.type === 'HT')    return <i className="fa-solid fa-pause" style={{ color: 'var(--text3)', fontSize: 12 }} />
  if (e.type === 'VAR')   return <i className="fa-solid fa-tv" style={{ color: 'var(--text3)', fontSize: 12 }} />
  return <i className="fa-solid fa-circle" style={{ color: 'var(--text3)', fontSize: 8 }} />
}

// ─── Match date helper ─────────────────────────────────
function formatMatchDate(iso, lang) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── Main Component ────────────────────────────────────
export default function MatchDetail() {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const { state }    = useLocation()
  const { t, lang }  = useLang()
  const { toggleFav, isFav } = useApp()
  const { user, authLoading, openAuthModal } = useAuth()

  // Fast path: match passed via navigation state; fallback to mock data
  const [allFixtures, setAllFixtures] = useState(null)
  useEffect(() => {
    if (!state?.match) getAllFixtures().then(setAllFixtures).catch(() => {})
  }, [id])
  const match = state?.match
    ?? MATCHES.find(m => m.id === Number(id))
    ?? allFixtures?.find(m => m.id === Number(id))

  // ── Load teams list for navigation (same 1 h cache) ──────────────────
  const { data: teamsData } = useApi(getTeams, { ttl: 3_600_000 })

  // ── Resolve navigable team objects from match ─────────────────────────
  // Priority: team1Id/team2Id on the match (API mode) → name lookup in teams list → null
  const navTeams = useMemo(() => {
    if (!match) return { t1: null, t2: null }
    const all = teamsData || TEAMS
    const findTeam = (name, teamId) => {
      if (teamId) return all.find(t => t.id === teamId) ?? { id: teamId, name, flag: match.flag1 }
      return all.find(t => t.name === name)
        || all.find(t => t.name.toLowerCase() === name?.toLowerCase())
        || null
    }
    return {
      t1: findTeam(match.team1, match.team1Id),
      t2: findTeam(match.team2, match.team2Id),
    }
  }, [match, teamsData])

  // Stats & events – only for started/finished matches
  const skip = !match || match.status === 'upcoming'

  const { data: stats,  loading: statsLoad,  error: statsErr  } =
    useApi(getMatchStats,  Number(id), { skip, ttl: 60_000 })
  const { data: events, loading: eventsLoad } =
    useApi(getMatchEvents, Number(id), { skip, ttl: 60_000 })

  // Predictions + odds — only for upcoming/live matches
  const skipPred = !match || match.status === 'ft'
  const { data: prediction, loading: predLoad } =
    useApi(getMatchPrediction, Number(id), { skip: skipPred, ttl: 1_800_000 })
  const { data: odds, loading: oddsLoad } =
    useApi(getMatchOdds, Number(id), { skip: skipPred, ttl: 1_800_000 })

  // Head-to-head — only when both team IDs are available
  const h2hKey = match?.team1Id && match?.team2Id
    ? `${match.team1Id}-${match.team2Id}` : null
  const { data: h2h, loading: h2hLoad } =
    useApi(
      () => getHeadToHead(match?.team1Id, match?.team2Id, 5),
      h2hKey,
      { skip: !h2hKey, ttl: 86_400_000 }
    )

  // Highlight video — only for finished matches
  const { data: highlight } = useApi(
    () => getMatchHighlight(match?.team1, match?.team2),
    `${match?.team1}-${match?.team2}`,
    { skip: !match || match.status !== 'ft', ttl: 1_800_000 }
  )

  // ── Auth gate — wait for token validation before showing sign-in ──
  if (!user && !authLoading) return (
    <div className="page-content page-enter" style={{ textAlign: 'center', padding: '80px 24px' }}>
      <div style={{ position: 'relative', display: 'inline-flex', justifyContent: 'center', marginBottom: 20 }}>
        <i className="fa-regular fa-futbol" style={{ fontSize: 52, color: 'var(--gold)', opacity: 0.85 }} />
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

  // ── 404 ──────────────────────────────────────────────
  if (!match) return (
    <div className="page-content" style={{ textAlign: 'center', padding: '80px 0' }}>
      <i className="fa-solid fa-magnifying-glass" style={{ fontSize: 48, marginBottom: 16, color: 'var(--text3)', display: 'block' }} />
      <h2>{t('match','not_found')}</h2>
      <button className="btn btn-outline mt-16" onClick={() => navigate('/matches')}>
        ← {t('common','back')}
      </button>
    </div>
  )

  const { team1, flag1, team2, flag2, score1, score2, status, time, group, venue, stadium, date, referee } = match
  const { t1: navTeam1, t2: navTeam2 } = navTeams

  const goToTeam = (navTeam, name, flag) => {
    if (!navTeam) return
    navigate(`/teams/${navTeam.id}`, { state: { team: { ...navTeam, name, flag } } })
  }

  // ── Render ────────────────────────────────────────────
  return (
    <div className="page-content page-enter">
      <button className="btn btn-ghost btn-sm mb-24" onClick={() => navigate('/matches')}>
        ← {t('common','back')}
      </button>

      {/* ── Match header card ── */}
      <div className="card mb-16">

        {/* Top meta row */}
        <div className="flex-between mb-16">
          <span className="badge badge-gold">
            {group || '—'}
          </span>

          {status === 'live' ? (
            <div className="flex-center gap-6" style={{ color: 'var(--red)', fontWeight: 700, fontSize: 13 }}>
              <span className="live-dot" aria-hidden="true" />
              {t('common','live')} {time}
            </div>
          ) : status === 'ft' ? (
            <span className="badge badge-gray">
              {t('common','full_time')}
            </span>
          ) : (
            <span className="badge badge-electric">{time}</span>
          )}
        </div>

        {/* Teams + Score */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 8,
          textAlign: 'center', marginBottom: 20,
        }}>
          {/* Home team — clickable → TeamDetail */}
          <div
            style={{
              flex: 1, minWidth: 0, cursor: navTeam1 ? 'pointer' : 'default',
              transition: 'opacity 0.15s',
            }}
            onClick={() => goToTeam(navTeam1, team1, flag1)}
            role={navTeam1 ? 'button' : undefined}
            tabIndex={navTeam1 ? 0 : undefined}
            onKeyDown={e => e.key === 'Enter' && goToTeam(navTeam1, team1, flag1)}
            aria-label={navTeam1 ? `View ${team1} team page` : undefined}
            onMouseEnter={e => { if (navTeam1) e.currentTarget.style.opacity = '0.75' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          >
            <TeamFlag flag={flag1} name={team1} size={52} />
            <h2 className="fw-600" style={{
              fontSize: 'clamp(13px, 3.5vw, 18px)',
              lineHeight: 1.3,
              overflowWrap: 'break-word',
              wordBreak: 'break-word',
            }}>
              {team1}
              {navTeam1 && <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 4, verticalAlign: 'middle' }}>↗</span>}
            </h2>
          </div>

          {/* Score / VS */}
          <div style={{ flexShrink: 0, textAlign: 'center' }}>
            {status !== 'upcoming' ? (
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 56,
                letterSpacing: 6,
                lineHeight: 1,
                marginBottom: 4,
              }}>
                <span style={{ color: score1 > score2 ? 'var(--gold)' : 'var(--text)' }}>{score1}</span>
                <span style={{ color: 'var(--text3)', margin: '0 4px' }}>–</span>
                <span style={{ color: score2 > score1 ? 'var(--gold)' : 'var(--text)' }}>{score2}</span>
              </div>
            ) : (
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 28, color: 'var(--text3)',
              }}>VS</div>
            )}
          </div>

          {/* Away team — clickable → TeamDetail */}
          <div
            style={{
              flex: 1, minWidth: 0, cursor: navTeam2 ? 'pointer' : 'default',
              transition: 'opacity 0.15s',
            }}
            onClick={() => goToTeam(navTeam2, team2, flag2)}
            role={navTeam2 ? 'button' : undefined}
            tabIndex={navTeam2 ? 0 : undefined}
            onKeyDown={e => e.key === 'Enter' && goToTeam(navTeam2, team2, flag2)}
            aria-label={navTeam2 ? `View ${team2} team page` : undefined}
            onMouseEnter={e => { if (navTeam2) e.currentTarget.style.opacity = '0.75' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          >
            <TeamFlag flag={flag2} name={team2} size={52} />
            <h2 className="fw-600" style={{
              fontSize: 'clamp(13px, 3.5vw, 18px)',
              lineHeight: 1.3,
              overflowWrap: 'break-word',
              wordBreak: 'break-word',
            }}>
              {team2}
              {navTeam2 && <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 4, verticalAlign: 'middle' }}>↗</span>}
            </h2>
          </div>
        </div>

        {/* Venue — between teams and date */}
        {(venue || stadium) && (
          <div className="caption" style={{ textAlign: 'center', marginBottom: 6, color: 'var(--text3)', fontSize: 12 }}>
            <i className="fa-solid fa-location-dot" style={{ marginRight: 5, opacity: 0.6 }} />
            {[venue, stadium].filter(Boolean).join(' · ')}
          </div>
        )}

        {/* Match date */}
        {date && (
          <div className="caption" style={{ textAlign: 'center', marginBottom: 16, color: 'var(--text3)' }}>
            {formatMatchDate(date, lang)}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-8 flex-wrap" style={{ justifyContent: 'center' }}>
          <button
            className={`btn btn-sm ${isFav('matches', match.id) ? 'btn-gold' : 'btn-outline'}`}
            onClick={() => toggleFav('matches', { ...match, name: `${team1} vs ${team2}` })}
          >
            {isFav('matches', match.id) ? t('match','saved') : t('match','save')}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/predict', {
              state: {
                preselect1: navTeam1?.id ?? null,
                preselect2: navTeam2?.id ?? null,
              }
            })}
          >
            {t('match','ai_predict')}
          </button>
        </div>
      </div>

      {/* ── Highlights ── */}
      {status === 'ft' && highlight && (
        <div className="card mb-16" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px 0' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px', color: 'var(--text)' }}>
              <i className="fa-solid fa-circle-play" style={{ color: 'var(--gold)', marginRight: 8 }} aria-hidden="true" />
              {t('home','highlights')}
            </h3>
          </div>
          <div style={{ padding: '0 16px 16px' }}>
            <YouTubeEmbed videoId={highlight.videoId} title={highlight.title} thumbnail={highlight.thumbnail} />
          </div>
        </div>
      )}

      {/* ── Predictions + Odds ── */}
      {!skipPred && (predLoad || prediction || odds) && (
        <div className="card mb-16">
          <h3 className="fw-600 mb-16" style={{ fontSize: 15 }}>
            <i className="fa-solid fa-chart-simple" style={{ marginRight: 8, color: 'var(--gold)' }} />
            {lang === 'es' ? 'Predicción del partido' : 'Match Prediction'}
          </h3>

          {predLoad ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 20, borderRadius: 6 }} />)}
            </div>
          ) : prediction && !(prediction.home === prediction.draw && prediction.draw === prediction.away) ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                {[
                  { label: team1, pct: prediction.home, color: 'var(--gold)' },
                  { label: lang === 'es' ? 'Empate' : 'Draw', pct: prediction.draw, color: 'var(--text3)' },
                  { label: team2, pct: prediction.away, color: 'var(--electric)' },
                ].map(({ label, pct, color }) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color, lineHeight: 1, marginBottom: 4 }}>
                      {pct}%
                    </div>
                    <div className="caption" style={{ fontSize: 10, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {label}
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 6 }}>
                      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 2, background: color, transition: 'width 0.9s ease' }} />
                    </div>
                  </div>
                ))}
              </div>

              {prediction.winner && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px', borderRadius: 8,
                  background: 'rgba(240,180,41,0.08)',
                  border: '0.5px solid rgba(240,180,41,0.25)',
                  marginBottom: prediction.advice ? 10 : 0,
                }}>
                  <i className="fa-solid fa-trophy" style={{ color: 'var(--gold)', fontSize: 14, flexShrink: 0 }} />
                  <span style={{ fontSize: 13 }}>
                    <strong style={{ color: 'var(--gold)' }}>
                      {lang === 'es' ? 'Predicción: ' : 'Prediction: '}
                    </strong>
                    {prediction.winner}
                    {prediction.winnerComment ? ` — ${prediction.winnerComment}` : ''}
                  </span>
                </div>
              )}

              {prediction.advice && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: 'var(--text3)', fontStyle: 'italic', marginTop: 8 }}>
                  <i className="fa-solid fa-lightbulb" style={{ marginTop: 1, flexShrink: 0 }} />
                  {prediction.advice}
                </div>
              )}
            </>
          ) : null}

          {!oddsLoad && odds && (
            <>
              <div style={{ height: '0.5px', background: 'var(--border)', margin: '16px 0' }} />
              <div className="caption mb-8" style={{ color: 'var(--text3)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {lang === 'es' ? `Cuotas · ${odds.bookmaker}` : `Odds · ${odds.bookmaker}`}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                  { label: '1', sublabel: team1, val: odds.home, color: 'var(--gold)' },
                  { label: 'X', sublabel: lang === 'es' ? 'Empate' : 'Draw', val: odds.draw, color: 'var(--text3)' },
                  { label: '2', sublabel: team2, val: odds.away, color: 'var(--electric)' },
                ].map(({ label, sublabel, val, color }) => (
                  <div key={label} style={{
                    background: 'var(--card2)', borderRadius: 8, padding: '10px 8px', textAlign: 'center',
                    border: '0.5px solid var(--border)',
                  }}>
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color, lineHeight: 1, marginBottom: 4 }}>
                      {val ?? '—'}
                    </div>
                    <div className="caption" style={{ fontSize: 9, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {sublabel}
                    </div>
                  </div>
                ))}
              </div>
              <div className="caption" style={{ color: 'var(--text3)', fontSize: 9, marginTop: 8, textAlign: 'center' }}>
                {lang === 'es' ? 'Las apuestas son solo informativas. Juega responsablemente.' : 'Odds are informational only. Gamble responsibly.'}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Timeline + Stats ── */}
      <div className="grid-2 mb-16">

        {/* Timeline */}
        <div className="card">
          <h3 className="fw-600 mb-12" style={{ fontSize: 15 }}>
            {t('match','timeline')}
          </h3>

          {status === 'upcoming' ? (
            <div className="caption" style={{ color: 'var(--text3)', padding: '24px 0', textAlign: 'center' }}>
              {t('match','timeline_upcoming')}
            </div>
          ) : eventsLoad ? (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '24px 0' }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton" style={{ width: 8, height: 8, borderRadius: '50%' }} />
              ))}
            </div>
          ) : !(events || []).length ? (
            <div className="caption" style={{ color: 'var(--text3)', padding: '24px 0', textAlign: 'center' }}>
              {t('match','no_events')}
            </div>
          ) : (
            <div role="list">
              {(events || []).map((e, i) => (
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

        {/* Statistics */}
        <div className="card">
          <h3 className="fw-600 mb-12" style={{ fontSize: 15 }}>
            {t('match','statistics')}
          </h3>

          {status === 'upcoming' ? (
            <div className="caption" style={{ color: 'var(--text3)', padding: '24px 0', textAlign: 'center' }}>
              {t('match','stats_upcoming')}
            </div>
          ) : (
            <ApiStatus loading={statsLoad} error={statsErr} data={stats}
              skeleton="none" skeletonCount={5} skeletonHeight={28}>
              {stats && (
                <>
                  {/* Team name labels */}
                  <div className="flex-between mb-16" style={{ fontSize: 11, fontWeight: 700 }}>
                    <span style={{ color: 'var(--gold)' }}>{team1}</span>
                    <span style={{ color: 'var(--text3)', fontWeight: 400, fontSize: 10 }}>
                      {lang === 'es' ? 'vs' : 'vs'}
                    </span>
                    <span style={{ color: 'var(--blue)' }}>{team2}</span>
                  </div>

                  <StatBar label={lang === 'es' ? 'Posesión'     : 'Possession'}   v1={stats.possession?.home}    v2={stats.possession?.away}    unit="%" />
                  <StatBar label={lang === 'es' ? 'Tiros'        : 'Shots'}        v1={stats.shots?.home}         v2={stats.shots?.away} />
                  <StatBar label={lang === 'es' ? 'A puerta'     : 'On Target'}    v1={stats.shotsOnTarget?.home} v2={stats.shotsOnTarget?.away} />
                  <StatBar label={lang === 'es' ? 'Córners'      : 'Corners'}      v1={stats.corners?.home}       v2={stats.corners?.away} />
                  <StatBar label={lang === 'es' ? 'Faltas'       : 'Fouls'}        v1={stats.fouls?.home}         v2={stats.fouls?.away} />
                  <StatBar label={lang === 'es' ? 'T. amarillas' : 'Yellow Cards'} v1={stats.yellowCards?.home}   v2={stats.yellowCards?.away} />
                  {(stats.xg?.home || stats.xg?.away) && (
                    <StatBar label="xG" v1={stats.xg?.home} v2={stats.xg?.away} />
                  )}
                </>
              )}
            </ApiStatus>
          )}
        </div>
      </div>

      {/* ── Head to Head ── */}
      {(h2hLoad || (h2h && h2h.length > 0)) && (
        <div className="card mb-16">
          <h3 className="fw-600 mb-16" style={{ fontSize: 15 }}>
            <>
              <i className="fa-solid fa-shield-halved" style={{ marginRight: 8, color: 'var(--gold)' }} />
              {lang === 'es' ? 'Historial de enfrentamientos' : 'Head to Head'}
            </>
          </h3>

          {h2hLoad ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 36, borderRadius: 6 }} />)}
            </div>
          ) : (
            <>
              {/* Win summary */}
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

              {/* Match list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {h2h.map((m, i) => {
                  const isT1Win = m.winner === team1
                  const isT2Win = m.winner === team2
                  const isDraw  = m.winner === 'Draw'
                  const year    = m.date ? new Date(m.date).getFullYear() : ''
                  return (
                    <div key={m.id || i} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px', borderRadius: 8,
                      background: 'var(--card2)', border: '0.5px solid var(--border)',
                    }}>
                      <span className="caption" style={{ fontSize: 10, color: 'var(--text3)', flexShrink: 0, minWidth: 32 }}>{year}</span>
                      <span style={{ flex: 1, fontSize: 12, textAlign: 'right', fontWeight: isT1Win ? 700 : 400, color: isT1Win ? 'var(--gold)' : 'var(--text)' }}>{m.home}</span>
                      <span style={{
                        fontSize: 12, fontWeight: 700, flexShrink: 0, minWidth: 48, textAlign: 'center',
                        color: isDraw ? 'var(--text3)' : isT1Win ? 'var(--gold)' : 'var(--electric)',
                      }}>{m.score ?? 'vs'}</span>
                      <span style={{ flex: 1, fontSize: 12, textAlign: 'left', fontWeight: isT2Win ? 700 : 400, color: isT2Win ? 'var(--electric)' : 'var(--text)' }}>{m.away}</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Venue ── */}
      {(venue || stadium) && (
        <div className="card">
          <h3 className="fw-600 mb-12" style={{ fontSize: 15 }}>
            {t('match','venue')}
          </h3>
          <div className="flex-between" style={{ alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {venue && (
                <div className="fw-600">{venue}</div>
              )}
              {stadium && (
                <div className="caption" style={{ color: 'var(--text3)' }}>{stadium}</div>
              )}
              {!venue && !stadium && (
                <div className="caption" style={{ color: 'var(--text3)' }}>—</div>
              )}
            </div>
            <span className="badge badge-blue" style={{ flexShrink: 0 }}>FIFA WC 2026</span>
          </div>
          {referee && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fa-solid fa-whistle" style={{ color: 'var(--text3)', fontSize: 12 }} aria-hidden="true" />
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                {t('match','referee') || 'Referee'}:
              </span>
              <span className="fw-600" style={{ fontSize: 12, color: 'var(--text)' }}>{referee}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}