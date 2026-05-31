import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useApi, useApiPolling } from '../hooks/useApi'
import { getLiveMatches, getStandings, getTopScorers, getTeams, getAllFixtures, TEAM_ISO } from '../services/sportsService'
import { getNews } from '../services/newsService'
import { TEAMS, GROUPS } from '../data/mockData'
import MatchCard from '../components/common/MatchCard'
import ApiStatus from '../components/common/ApiStatus'
import NewsReader from '../components/common/NewsReader'
import '../components/common/MatchCard.css'
import './Home.css'

// ── Fallback: WC 2026 inaugural (used when no API fixtures available) ───
const INAUGURAL_DATE = new Date('2026-06-11T22:00:00Z')
const INAUGURAL = {
  team1: 'Mexico', team2: 'Ecuador',
  group: '', venue: 'Estadio Azteca, Mexico City',
}

// ── Countdown hook ────────────────────────────────────
function useCountdown(target) {
  const calc = () => Math.max(0, (target?.getTime?.() ?? 0) - Date.now())
  const [ms, setMs] = useState(calc)
  useEffect(() => {
    setMs(calc())
    if (ms <= 0) return
    const id = setInterval(() => setMs(calc()), 1000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.getTime?.()])
  const days    = Math.floor(ms / 86400000)
  const hours   = Math.floor((ms % 86400000) / 3600000)
  const minutes = Math.floor((ms % 3600000)  / 60000)
  const seconds = Math.floor((ms % 60000)    / 1000)
  return { days, hours, minutes, seconds, expired: ms <= 0 }
}

// ── Normalise phase / round label ────────────────────
function formatPhase(group, lang) {
  if (!group) return lang === 'es' ? 'Próximo Partido' : 'Next Match'
  const g = group.trim()
  // Short codes from mock data
  if (g === 'Final')  return 'Final'
  if (g === 'SF')     return lang === 'es' ? 'Semifinales'        : 'Semi-finals'
  if (g === 'QF')     return lang === 'es' ? 'Cuartos de Final'   : 'Quarter-finals'
  if (g === 'R32')    return lang === 'es' ? 'Ronda de 32'        : 'Round of 32'
  if (g === 'R16')    return lang === 'es' ? 'Octavos de Final'   : 'Round of 16'
  if (/^grp\s+([A-L])/i.test(g)) {
    const letter = g.match(/[A-L]/i)?.[0]?.toUpperCase() || ''
    return lang === 'es' ? `Grupo ${letter}` : `Group ${letter}`
  }
  // API long-form: "Group Stage - 3", "Group A"
  if (/group/i.test(g)) {
    const letter = g.match(/\b([A-L])\b/)?.[1]?.toUpperCase() || ''
    const num    = g.match(/[-–]\s*(\d+)/)?.[1] || ''
    if (letter) return lang === 'es' ? `Grupo ${letter}` : `Group ${letter}`
    if (num)    return lang === 'es' ? `Fase de Grupos · J${num}` : `Group Stage · M${num}`
  }
  if (/round of 32/i.test(g))  return lang === 'es' ? 'Ronda de 32'      : 'Round of 32'
  if (/round of 16/i.test(g))  return lang === 'es' ? 'Octavos de Final' : 'Round of 16'
  if (/quarter/i.test(g))      return lang === 'es' ? 'Cuartos de Final' : 'Quarter-finals'
  if (/semi/i.test(g))         return lang === 'es' ? 'Semifinales'      : 'Semi-finals'
  if (/final/i.test(g))        return 'Final'
  return g
}

// ── Flag image from flagcdn.com ───────────────────────
function FlagImg({ name, size = 44 }) {
  const iso = TEAM_ISO[name]
  if (!iso) return null
  return (
    <img
      src={`https://flagcdn.com/w80/${iso}.png`}
      alt={name}
      style={{
        width: Math.round(size * 1.5), height: size,
        objectFit: 'cover', borderRadius: 6,
        border: '1px solid rgba(255,255,255,0.12)',
        display: 'block',
      }}
      onError={e => { e.target.style.display = 'none' }}
    />
  )
}

// ── Dynamic countdown to next match ──────────────────
function DynamicCountdown({ upcoming, lang }) {
  const [idx, setIdx] = useState(0)

  // Reset index when the list changes (fresh fixtures loaded)
  useEffect(() => { setIdx(0) }, [upcoming])

  const match = upcoming[idx] ?? null
  const targetDate = useMemo(
    () => match ? new Date(match.date) : INAUGURAL_DATE,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [match?.date]
  )

  const { days, hours, minutes, seconds, expired } = useCountdown(targetDate)

  // When countdown hits 0, advance to the next scheduled match
  useEffect(() => {
    if (!expired) return
    if (idx < upcoming.length - 1) {
      const t = setTimeout(() => setIdx(i => i + 1), 3000)
      return () => clearTimeout(t)
    }
  }, [expired, idx, upcoming.length])

  // Nothing left to show
  if (expired && (upcoming.length === 0 || idx >= upcoming.length - 1)) return null

  const team1  = match?.team1  ?? INAUGURAL.team1
  const team2  = match?.team2  ?? INAUGURAL.team2
  const phase  = match
    ? formatPhase(match.group, lang)
    : (lang === 'es' ? 'Partido Inaugural' : 'Opening Match')
  const venue  = match
    ? [match.venue, match.stadium].filter(Boolean).join(' · ')
    : INAUGURAL.venue

  const units = lang === 'es'
    ? [{ v: days, l: 'Días' }, { v: hours, l: 'Horas' }, { v: minutes, l: 'Min' }, { v: seconds, l: 'Seg' }]
    : [{ v: days, l: 'Days' }, { v: hours, l: 'Hours' }, { v: minutes, l: 'Min' }, { v: seconds, l: 'Sec' }]

  return (
    <div className="card" style={{
      background: 'linear-gradient(135deg, rgba(240,180,41,.08), rgba(240,180,41,.02))',
      border: '1px solid rgba(240,180,41,.2)',
      textAlign: 'center', padding: '24px 20px',
    }}>
      {/* Phase label */}
      <div className="caption mb-8" style={{
        color: 'var(--gold)', letterSpacing: 2,
        textTransform: 'uppercase', fontSize: 10,
      }}>
        {phase} · FIFA World Cup 2026
      </div>

      {/* Teams with image flags */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <FlagImg name={team1} size={44} />
          <span style={{ fontWeight: 700, fontSize: 13 }}>{team1}</span>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text3)' }}>VS</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <FlagImg name={team2} size={44} />
          <span style={{ fontWeight: 700, fontSize: 13 }}>{team2}</span>
        </div>
      </div>

      {/* Countdown units */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
        {units.map(({ v, l }) => (
          <div key={l} style={{
            background: 'rgba(0,0,0,0.3)', borderRadius: 8,
            padding: '10px 14px', minWidth: 52,
            border: '1px solid rgba(240,180,41,.15)',
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, lineHeight: 1, color: 'var(--gold)' }}>
              {String(v).padStart(2, '0')}
            </div>
            <div className="caption" style={{ fontSize: 9, color: 'var(--text3)', marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 }}>
              {l}
            </div>
          </div>
        ))}
      </div>

      {venue && (
        <div className="caption" style={{ color: 'var(--text3)', fontSize: 11 }}>{venue}</div>
      )}
    </div>
  )
}

// ── Hero ─────────────────────────────────────────────
function Hero() {
  const { t } = useLang()
  return (
    <div className="hero" role="banner">
      <div className="hero-badge">
        <span className="live-dot" aria-hidden="true" />
        FIFA WORLD CUP 2026
      </div>
      <div className="hero-hosts" aria-label="Host countries">
        {[
          { code: 'us', name: 'USA' },
          { code: 'ca', name: 'Canada' },
          { code: 'mx', name: 'Mexico' },
        ].map(({ code, name }, i) => (
          <React.Fragment key={code}>
            {i > 0 && <span className="hero-host-sep" aria-hidden="true">·</span>}
            <span className="hero-host">
              <img
                src={`https://flagcdn.com/w40/${code}.png`}
                alt={name}
                className="hero-host-flag"
              />
              {name}
            </span>
          </React.Fragment>
        ))}
      </div>
      <h1 className="hero-title">MY WORLD CUP</h1>
      <p className="hero-subtitle">{t('home','hero_sub')}</p>
      <div className="hero-stats" role="list">
        {[
          { num:'48',  label:t('common','teams')    },
          { num:'104', label:t('common','matches')   },
          { num:'16',  label:t('common','venues')    },
          { num:'3',   label:t('common','countries') },
        ].map(({ num, label }) => (
          <div key={label} className="hero-stat" role="listitem">
            <div className="hero-stat-num">{num}</div>
            <div className="hero-stat-label">{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Group standings table ─────────────────────────────
function GroupTable({ group, groups, lang }) {
  const teams = (groups || GROUPS)[group]
  if (!teams) return null
  return (
    <div className="table-scroll-wrap">
      <table className="data-table" aria-label={`Group ${group} standings`} style={{ minWidth: 280 }}>
        <thead><tr>
          <th style={{ width: 26 }}>#</th>
          <th>{lang === 'es' ? 'Equipo' : 'Team'}</th>
          <th>MP</th>
          <th className="col-hide-xs">W</th>
          <th className="col-hide-xs">D</th>
          <th className="col-hide-xs">L</th>
          <th>GD</th>
          <th className="text-gold">Pts</th>
        </tr></thead>
        <tbody>
          {teams.map((t, i) => {
            const gd = t.gf - t.ga
            return (
              <tr key={t.name}>
                <td><div className={`standing-pos${i < 2 ? ' qualify' : ''}`}>{i + 1}</div></td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {typeof t.flag === 'string' && t.flag.startsWith('http')
                    ? <img src={t.flag} alt="" style={{ width: 18, marginRight: 5, verticalAlign: 'middle' }} />
                    : <span style={{ marginRight: 5, fontSize: 14 }}>{t.flag}</span>
                  }
                  {t.name}
                </td>
                <td>{t.mp}</td>
                <td className="col-hide-xs">{t.w}</td>
                <td className="col-hide-xs">{t.d}</td>
                <td className="col-hide-xs">{t.l}</td>
                <td className={gd > 0 ? 'text-green' : gd < 0 ? 'text-red' : 'text-muted'}>{gd > 0 ? '+' : ''}{gd}</td>
                <td className="text-gold fw-600">{t.pts}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Main component ────────────────────────────────────
export default function Home() {
  const { t, lang }          = useLang()
  const { toggleFav, isFav } = useApp()
  const { user, setAuthRequiredOpen } = useAuth()
  const navigate = useNavigate()
  const [activeGroup, setActiveGroup] = React.useState('A')
  const [reading, setReading]         = useState(null)

  const { data: liveMatches, loading: liveLoad } = useApiPolling(getLiveMatches, 30_000)
  const { data: standings  }                      = useApi(getStandings,   { ttl: 3_600_000 })
  const { data: allTeams   }                      = useApi(getTeams,       { ttl: 3_600_000 })
  const { data: headlines  }                      = useApi(getNews, 'all', lang, 10, { ttl: 120_000 })
  const { data: scorers, loading: scorersLoad }   = useApi(getTopScorers,  { ttl: 3_600_000 })
  const { data: allFixtures }                     = useApi(getAllFixtures,  { ttl: 1_800_000 })

  // Next upcoming matches — sorted by date, only future or very-recent kickoffs
  const upcomingMatches = useMemo(() => {
    const cutoff = Date.now() - 120 * 60 * 1000 // still show within 2h after kickoff
    return (allFixtures || [])
      .filter(m => m.status === 'upcoming' && m.date && new Date(m.date).getTime() > cutoff)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
  }, [allFixtures])

  const topPlayers = useMemo(() => {
    if (!scorers) return []
    return [...scorers]
      .sort((a, b) => (parseFloat(b.rating) - parseFloat(a.rating)) || (b.goals - a.goals))
      .slice(0, 5)
  }, [scorers])

  const rankedTeams = useMemo(() =>
    [...(allTeams || TEAMS)]
      .filter(t => t.rank)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 5)
  , [allTeams])

  const displayMatches = liveMatches?.length ? liveMatches.slice(0, 4) : []

  return (
    <div className="page-content page-enter">
      <Hero />

      {/* ── Live & Upcoming matches ── */}
      <section className="mb-24">
        <div className="section-header">
          <h2 className="section-title"> <span>{t('home','live_today')}</span></h2>
          <button className="see-all" onClick={() => navigate('/matches')}>{t('common','see_all')} →</button>
        </div>

        {liveLoad ? (
          <div className="grid-2">
            {[1,2,3,4].map(i => (
              <div key={i} className="skeleton" style={{ height: 145, borderRadius: 'var(--radius)' }} />
            ))}
          </div>
        ) : displayMatches.length ? (
          <div className="grid-2">
            {displayMatches.map(m => <MatchCard key={m.id} match={m} />)}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Dynamic countdown to next match */}
            <DynamicCountdown upcoming={upcomingMatches} lang={lang} />
            <div className="card" style={{ textAlign: 'center', padding: '24px', color: 'var(--text3)' }}>
              {t('home','no_live')}{' '}
              <button className="see-all" onClick={() => navigate('/matches')}>{t('common','see_all')} →</button>
            </div>
          </div>
        )}
      </section>

      {/* ── Groups + Ranking ── */}
      <section className="grid-2 mb-24">
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div className="section-header mb-16">
            <h2 className="section-title"> <span>{t('home','group_stage')}</span></h2>
          </div>
          <div className="card" style={{ flex: 1, minWidth: 0 }}>
            <div className="scroll-tabs" role="tablist" style={{ marginBottom: 14 }}>
              {['A','B','C','D','E','F','G','H','I','J','K','L'].map(g => (
                <button key={g}
                  className={`scroll-tab${activeGroup === g ? ' active' : ''}`}
                  onClick={() => setActiveGroup(g)}
                  role="tab" aria-selected={activeGroup === g}
                  style={{ padding: '5px 10px', fontSize: 11 }}>
                  {g}
                </button>
              ))}
            </div>
            <GroupTable group={activeGroup} groups={standings} lang={lang} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div className="section-header mb-16">
            <h2 className="section-title"><span>{t('home','ranking')}</span></h2>
            <button className="see-all" onClick={() => navigate('/ranking')}>{t('common','see_all')} →</button>
          </div>
          <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden', minWidth: 0 }}>
            {rankedTeams.map((team, i) => {
              const flagIso = TEAM_ISO[team.name]
              const flagSrc = flagIso ? `https://flagcdn.com/w40/${flagIso}.png` : null
              return (
                <button key={team.id}
                  className="card-clickable"
                  onClick={() => navigate(`/teams/${team.id}`)}
                  style={{
                    width: '100%', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px',
                    background: i === 0 ? 'rgba(240,180,41,0.06)' : 'transparent',
                    borderLeft: i === 0 ? '3px solid var(--gold)' : '3px solid transparent',
                    borderBottom: i < rankedTeams.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    transition: 'background 0.2s, transform 0.2s cubic-bezier(0.4,0,0.2,1)',
                  }}>

                  {/* ── Rank badge ── */}
                  <div style={{
                    width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
                    background: i === 0 ? 'var(--gold-grad)' : 'rgba(255,255,255,0.06)',
                    color: i === 0 ? 'var(--navy)' : 'var(--text3)',
                  }}>
                    {team.rank}
                  </div>

                  {/* ── Flag ── */}
                  <div style={{ width: 38, height: 26, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {flagSrc ? (
                      <img src={flagSrc} alt={team.name}
                        style={{ width: 38, height: 26, objectFit: 'cover', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)', display: 'block' }}
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    ) : typeof team.flag === 'string' && team.flag.startsWith('http') ? (
                      <img src={team.flag} alt={team.name}
                        style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 4 }}
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    ) : (
                      <span style={{ fontSize: 20 }}>{team.flag}</span>
                    )}
                  </div>

                  {/* ── Name + confederation ── */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="fw-600" style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text)' }}>
                      {team.name}
                    </div>
                    <div className="caption" style={{ fontSize: 10 }}>{team.confederation}</div>
                  </div>

                  {/* ── WC titles ── */}
                  {team.titles > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600, flexShrink: 0 }}>
                      {team.titles}× WC
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Top Scorers ── */}
      <section className="mb-24">
        <div className="section-header">
          <h2 className="section-title"><span>{t('home','top_players')}</span></h2>
          <button className="see-all" onClick={() => navigate('/players')}>{t('common','see_all')} →</button>
        </div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

          {/* ── Skeleton (5 rows) ── */}
          {scorersLoad && topPlayers.length === 0 && (
            [1,2,3,4,5].map(i => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px',
                borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <div className="skeleton" style={{ width:28, height:28, borderRadius:6, flexShrink:0 }} />
                <div className="skeleton" style={{ width:44, height:44, borderRadius:8, flexShrink:0 }} />
                <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
                  <div className="skeleton" style={{ width:'55%', height:12, borderRadius:4 }} />
                  <div className="skeleton" style={{ width:'35%', height:10, borderRadius:4 }} />
                  <div className="skeleton" style={{ width:'80%', height:3, borderRadius:2 }} />
                </div>
                <div className="skeleton" style={{ width:64, height:30, borderRadius:6 }} />
              </div>
            ))
          )}

          {/* ── Player rows ── */}
          {topPlayers.map((p, i) => {
            const maxG = Math.max(topPlayers[0]?.goals || 0, 1)
            const pct  = Math.round(((p.goals || 0) / maxG) * 100)
            return (
              <button key={p.id}
                className="card-clickable"
                onClick={() => navigate(`/players/${p.id}`, { state: { player: p } })}
                aria-label={`#${i+1} ${p.name}`}
                style={{
                  width:'100%', textAlign:'left',
                  display:'flex', alignItems:'center', gap:12, padding:'12px 16px',
                  background: i === 0 ? 'rgba(240,180,41,0.06)' : 'transparent',
                  borderLeft: i === 0 ? '3px solid var(--gold)' : '3px solid transparent',
                  borderBottom: i < topPlayers.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  transition:'background 0.2s, transform 0.2s cubic-bezier(0.4,0,0.2,1)',
                }}>

                {/* ── Rank badge ── */}
                <div style={{
                  width:28, height:28, borderRadius:6, flexShrink:0,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontFamily:'var(--font-display)', fontSize:13, fontWeight:700,
                  background: i===0 ? 'var(--gold-grad)' : 'rgba(255,255,255,0.06)',
                  color: i===0 ? 'var(--navy)' : 'var(--text3)',
                }}>{i+1}</div>

                {/* ── Photo ── */}
                <div style={{
                  width:44, height:44, borderRadius:8, flexShrink:0,
                  background:'rgba(240,180,41,0.08)',
                  border:`1.5px solid ${i===0 ? 'rgba(240,180,41,0.35)' : 'rgba(255,255,255,0.08)'}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  overflow:'hidden', fontSize:22,
                }}>
                  {p.photo
                    ? <img src={p.photo} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>{e.target.style.display='none'}} />
                    : (p.emoji || '★')}
                </div>

                {/* ── Name + position + bar ── */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:2 }}>
                    <span className="fw-600" style={{ fontSize:13, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', color:'var(--text)' }}>{p.name}</span>
                    {p.flag && <span style={{ opacity:0.45, fontSize:11, flexShrink:0 }}>{p.flag}</span>}
                  </div>
                  <div className="caption" style={{ fontSize:10, marginBottom:6 }}>
                    {[p.pos, p.club || p.nation].filter(Boolean).join(' · ')}
                  </div>
                  <div style={{ height:3, background:'rgba(255,255,255,0.07)', borderRadius:2 }}>
                    <div style={{
                      width:`${pct||3}%`, height:'100%', borderRadius:2,
                      background: i===0 ? 'var(--gold-grad)' : 'rgba(240,180,41,0.35)',
                      transition:'width 0.9s ease',
                    }} />
                  </div>
                </div>

                {/* ── Stats ── */}
                <div style={{ display:'flex', gap:12, flexShrink:0, textAlign:'center' }}>
                  <div>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:18, color:'var(--gold)', lineHeight:1 }}>{p.goals??0}</div>
                    <div className="caption" style={{ fontSize:9 }}>{t('common','goals_abbr')}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:18, color:'var(--text2)', lineHeight:1 }}>{p.assists??0}</div>
                    <div className="caption" style={{ fontSize:9 }}>{t('common','assists_abbr')}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:18, color:'var(--electric)', lineHeight:1 }}>{p.rating}</div>
                    <div className="caption" style={{ fontSize:9 }}>{t('common','rating_abbr')}</div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* ── News ── */}
      <section>
        <div className="section-header">
          <h2 className="section-title"> <span>{t('home','latest_news')}</span></h2>
          <button className="see-all" onClick={() => navigate('/news')}>{t('common','see_all')} →</button>
        </div>
        <div className="news-home-grid">
          {(headlines || []).slice(0, 4).map((n, i) => (
            <article
              key={n.id || i}
              className="news-article-card card card-clickable"
              tabIndex={0}
              onClick={() => user ? setReading(n) : setAuthRequiredOpen(true)}
              onKeyDown={e => e.key === 'Enter' && (user ? setReading(n) : setAuthRequiredOpen(true))}
              aria-label={n.title}
            >
              {n.image ? (
                <img
                  src={n.image} alt=""
                  className="news-article-img"
                  style={{ objectFit: 'cover', width: '100%' }}
                  onError={e => { e.target.style.display = 'none' }}
                />
              ) : (
                <div
                  className="news-article-img"
                  style={{ background: `linear-gradient(135deg,${n.color}22,${n.color}08)`,
                           fontSize: 52, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {n.emoji}
                </div>
              )}
              <div className="news-article-body">
                <div
                  className="news-cat-tag"
                  style={{ color: n.color, borderColor: `${n.color}44`, background: `${n.color}12` }}
                >
                  {n.catLabel || n.cat}
                </div>
                <h3 className="news-article-title">{n.title}</h3>
                {n.excerpt && (
                  <p className="caption mt-8" style={{
                    lineHeight: 1.55,
                    display: '-webkit-box',
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {n.excerpt}
                  </p>
                )}
                <div className="flex-between mt-8">
                  <time className="caption">{n.time}</time>
                  <button
                    className="news-bookmark-btn"
                    onClick={e => { e.stopPropagation(); toggleFav('articles', n) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: isFav('articles', n.id) ? 'var(--gold)' : 'var(--text3)' }}
                    aria-label={isFav('articles', n.id) ? (lang === 'es' ? 'Quitar de guardados' : 'Remove from saved') : (lang === 'es' ? 'Guardar noticia' : 'Save article')}
                  >
                    <i className={`fa-${isFav('articles', n.id) ? 'solid' : 'regular'} fa-bookmark`} />
                    {isFav('articles', n.id) ? (lang === 'es' ? 'Guardado' : 'Saved') : (lang === 'es' ? 'Guardar' : 'Save')}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* In-app article reader */}
      <NewsReader article={reading} onClose={() => setReading(null)} />
    </div>
  )
}
