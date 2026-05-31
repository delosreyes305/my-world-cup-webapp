import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { PLAYERS, TEAMS } from '../data/mockData'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { useApi } from '../hooks/useApi'
import { getTeams, IS_MOCK, getPlayerDetails } from '../services/sportsService'

function StatBar({ label, value, max }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="stat-bar">
      <div className="stat-bar-header">
        <span>{label}</span>
        <span className="text-gold">{pct.toFixed(0)}%</span>
      </div>
      <div className="stat-bar-track">
        <div className="stat-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function PlayerDetail() {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const { state }    = useLocation()
  const { toggleFav, isFav } = useApp()
  const { user, openAuthModal } = useAuth()
  const { t, lang }  = useLang()

  // API players are passed via navigation state; mock players fall back to PLAYERS array
  const player = state?.player ?? PLAYERS.find(p => p.id === Number(id))

  // ── Load teams list for navigation (1-hour cache) ───────────────
  // In API mode the team IDs are API-Football IDs (4-digit), not mock IDs.
  // We need the API teams to navigate to the correct TeamDetail page.
  const { data: teamsData } = useApi(getTeams, { ttl: 3_600_000 })

  // ── Fetch current club from club season when not available ───────
  // The WC endpoint returns national-team stats, so club = '' for API players.
  // getPlayerDetails calls /players?id=X&season=Y to get club stats.
  const [clubInfo, setClubInfo] = useState(null)
  useEffect(() => {
    setClubInfo(null)
    if (!player || player.club || IS_MOCK) return
    let cancelled = false
    getPlayerDetails(player.id)
      .then(info => { if (!cancelled && info?.club) setClubInfo(info) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [player?.id, player?.club])

  // ── Resolve the correct team for navigation ──────────────────────
  // Priority:
  //   1. player.teamId (set by getAllTeamPlayers — the reliable API team ID)
  //   2. Look up by nation name in the API teams list
  //   3. Fall back to mock TEAMS (for pure-mock mode)
  const navTeam = useMemo(() => {
    if (!player) return null
    const allTeams = teamsData || TEAMS

    if (player.teamId) {
      // player came from Players page in API mode — teamId is the API team ID
      return allTeams.find(t => t.id === player.teamId) ?? { id: player.teamId, name: player.nation }
    }

    // No teamId: find by nation name (handles both API and mock)
    if (player.nation) {
      const byExact = allTeams.find(t => t.name === player.nation)
      if (byExact) return byExact
      // Case-insensitive fallback
      const byCI = allTeams.find(t => t.name.toLowerCase() === player.nation.toLowerCase())
      if (byCI) return byCI
    }

    return null
  }, [player?.teamId, player?.nation, teamsData])

  // ── Auth gate ────────────────────────────────────────────────────
  if (!user) return (
    <div className="page-content page-enter" style={{ textAlign: 'center', padding: '80px 24px' }}>
      <div style={{ position: 'relative', display: 'inline-flex', justifyContent: 'center', marginBottom: 20 }}>
        <i className="fa-regular fa-user" style={{ fontSize: 52, color: 'var(--gold)', opacity: 0.85 }} />
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

  // ── 404 ──────────────────────────────────────────────────────────
  if (!player) return (
    <div className="page-content" style={{ textAlign: 'center', padding: '80px 0' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
      <h2>{t('player','not_found')}</h2>
      <button className="btn btn-outline mt-16" onClick={() => navigate('/players')}>
        ← {t('common','back')}
      </button>
    </div>
  )

  const posColor = { FW: 'var(--red)', MF: 'var(--blue)', DF: 'var(--green)', GK: 'var(--gold)' }

  // The display club: prefer player.club (mock / set from normalizer),
  // then fall back to the club fetched from the club-season endpoint.
  const displayClub = player.club || clubInfo?.club || ''

  return (
    <div className="page-content page-enter">
      <button className="btn btn-ghost btn-sm mb-24" onClick={() => navigate('/players')}>
        ← {t('common','back')}
      </button>

      {/* Header */}
      <div className="card mb-16">
        <div className="flex-center gap-24" style={{ flexWrap: 'wrap' }}>
          {player.photo ? (
            <img src={player.photo} alt={player.name}
              style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover',
                border: '2px solid rgba(240,180,41,0.2)', flexShrink: 0 }}
              onError={e => { e.target.style.display = 'none' }} />
          ) : (
            <div style={{ fontSize: 80, width: 100, height: 100, borderRadius: '50%',
              background: 'rgba(240,180,41,0.08)', border: '2px solid rgba(240,180,41,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              aria-hidden="true">
              {player.emoji || '★'}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div className="flex-center gap-12 mb-8" style={{ flexWrap: 'wrap' }}>
              <h1 className="fw-600" style={{ fontSize: 26 }}>{player.name}</h1>
              <span style={{ fontSize: 24 }} aria-label={player.nation}>{player.flag}</span>
              <span className="badge" style={{
                background: `${posColor[player.pos]}22`,
                color: posColor[player.pos],
                border: `1px solid ${posColor[player.pos]}44`,
              }}>
                {player.pos}
              </span>
            </div>

            {/* Sub-line: club · nation · age — club shows loading state while fetching */}
            <div className="caption" style={{ marginBottom: 12 }}>
              {[
                displayClub || (!player.club && !IS_MOCK && !clubInfo ? '…' : ''),
                player.nation,
                `${player.age} ${t('player','yrs')}`,
              ].filter(Boolean).join(' · ')}
            </div>

            <div className="flex gap-8 flex-wrap">
              <button
                className={`btn btn-sm ${isFav('players', player.id) ? 'btn-gold' : 'btn-outline'}`}
                onClick={() => toggleFav('players', player)}
              >
                {isFav('players', player.id) ? t('common','favorited') : t('common','add_fav')}
              </button>
              {navTeam && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => navigate(`/teams/${navTeam.id}`, { state: { team: navTeam } })}
                >
                  {t('player','view_team')} {navTeam.name || player.nation}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tournament stats */}
      <div className="grid-4 mb-16">
        {[
          { label: t('common','goals'),   val: player.goals   },
          { label: t('common','assists'),  val: player.assists  },
          { label: t('common','rating'),   val: player.rating   },
        ].map(s => (
          <div key={s.label} className="card-sm" style={{ textAlign: 'center' }}>
            <div className="label">{s.label}</div>
            <div className="val text-gold">{s.val}</div>
          </div>
        ))}
      </div>

      <div className="grid-2 mb-16">
        {/* Personal info */}
        <div className="card">
          <h2 className="fw-600 mb-16" style={{ fontSize: 15 }}>{t('player','info')}</h2>
          {[
            { label: t('player','nationality'), val: `${player.nation} ${player.flag}` },
            { label: t('player','club'),        val: displayClub || '—'               },
            { label: t('player','position'),    val: player.pos                        },
            { label: t('player','age'),         val: player.age                        },
            { label: t('player','height'),      val: player.height || '—'             },
            { label: t('player','weight'),      val: player.weight || '—'             },
            { label: t('player','caps'),        val: player.caps                       },
            { label: t('player','intl_goals'),  val: player.intlGoals                  },
          ].map(({ label, val }) => (
            <div key={label} className="flex-between" style={{ marginBottom: 10 }}>
              <span className="label" style={{ marginBottom: 0 }}>{label}</span>
              <span className="fw-600">{val}</span>
            </div>
          ))}
        </div>

        {/* Performance bars */}
        <div className="card">
          <h2 className="fw-600 mb-16" style={{ fontSize: 15 }}>{t('player','performance')}</h2>
          <StatBar label={t('player','scoring')}       value={player.goals}     max={10}  />
          <StatBar label={t('player','creativity')}    value={player.assists}   max={8}   />
          <StatBar label={t('player','overall_rating')} value={player.rating}   max={10}  />
          <StatBar label={t('player','intl_goals')}    value={player.intlGoals} max={120} />

        </div>
      </div>
    </div>
  )
}
