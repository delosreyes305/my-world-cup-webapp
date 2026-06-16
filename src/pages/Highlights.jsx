import React, { useState, useMemo } from 'react'
import { useLang } from '../context/LangContext'
import { useApi } from '../hooks/useApi'
import { getAllFixtures, TEAM_ISO } from '../services/sportsService'
import { getWorldCupHighlights, findHighlightForMatch } from '../services/youtubeService'
import YouTubeEmbed from '../components/common/YouTubeEmbed'
import ApiStatus from '../components/common/ApiStatus'

function Flag({ name, size = 14 }) {
  const iso = TEAM_ISO[name]
  if (!iso) return null
  return (
    <img src={`https://flagcdn.com/w40/${iso}.png`} alt={name}
      style={{ width: Math.round(size * 1.4), height: size, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }}
      onError={e => { e.target.style.display = 'none' }}
    />
  )
}

function HighlightCard({ match, video, lang }) {
  const [playing, setPlaying] = useState(false)
  const hasFT = match.status === 'ft'

  return (
    <div style={{
      background: 'var(--card)', borderRadius: 14, overflow: 'hidden',
      border: `1.5px solid ${video ? 'rgba(240,180,41,0.2)' : 'rgba(255,255,255,0.05)'}`,
      transition: 'transform 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div style={{ position: 'relative', aspectRatio: '16/9', background: 'var(--card2)' }}>
        {video ? (
          playing ? (
            <YouTubeEmbed videoId={video.videoId} title={video.title} thumbnail={video.thumbnail} autoplay />
          ) : (
            <>
              {video.thumbnail && (
                <img src={video.thumbnail} alt={video.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              )}
              <div onClick={() => setPlaying(true)} style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.35)', cursor: 'pointer', transition: 'background 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.55)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.35)' }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: '50%', background: 'var(--gold)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 20px rgba(240,180,41,0.5)',
                }}>
                  <i className="fa-solid fa-play" style={{ color: '#0a1628', fontSize: 18, marginLeft: 3 }} aria-hidden="true" />
                </div>
              </div>
              {hasFT && match.score1 != null && (
                <div style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'rgba(10,14,26,0.85)', backdropFilter: 'blur(4px)',
                  borderRadius: 6, padding: '3px 8px',
                  fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--gold)',
                  border: '1px solid rgba(240,180,41,0.3)',
                }}>
                  {match.score1} – {match.score2}
                </div>
              )}
            </>
          )
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <i className="fa-solid fa-video-slash" style={{ fontSize: 24, color: 'var(--text3)', opacity: 0.35 }} aria-hidden="true" />
            <span style={{ fontSize: 11, color: 'var(--text3)', opacity: 0.5 }}>
              {!hasFT ? (lang === 'es' ? 'Pendiente' : 'Upcoming') : (lang === 'es' ? 'Próximamente' : 'Coming soon')}
            </span>
          </div>
        )}
      </div>

      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 0 }}>
            <Flag name={match.team1} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{match.team1}</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: hasFT ? 'var(--gold)' : 'var(--text3)', fontFamily: 'var(--font-display)', flexShrink: 0 }}>
            {hasFT && match.score1 != null ? `${match.score1}–${match.score2}` : 'vs'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 0, justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right' }}>{match.team2}</span>
            <Flag name={match.team2} />
          </div>
        </div>
        {video && !playing && (
          <div style={{ marginTop: 8, textAlign: 'center' }}>
            <span style={{ fontSize: 10, color: 'var(--gold)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <i className="fa-solid fa-circle-play" aria-hidden="true" />
              {lang === 'es' ? 'Ver resumen' : 'Watch highlights'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function formatDate(dateStr, lang) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString(
    lang === 'es' ? 'es-ES' : 'en-US',
    { weekday: 'long', day: 'numeric', month: 'long' }
  ).replace(/^\w/, c => c.toUpperCase())
}

function localDateKey(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export default function Highlights() {
  const { lang } = useLang()
  const [activeRound, setActiveRound] = useState(null)
  const [activeDate, setActiveDate]   = useState('all')

  const { data: allFixtures, loading: fixturesLoad, error: fixturesErr } =
    useApi(getAllFixtures, null, { ttl: 300_000 })
  const { data: ytHighlights, loading: ytLoad } =
    useApi(getWorldCupHighlights, null, { ttl: 1_800_000 })

  // Group matches by round, sorted by date ASC
  const { rounds, roundKeys } = useMemo(() => {
    if (!allFixtures?.length) return { rounds: {}, roundKeys: [] }
    const rounds = {}
    for (const m of allFixtures) {
      const raw = m.group || ''
      const roundMatch = raw.match(/(\d+)$/)
      const round = roundMatch ? roundMatch[1] : '1'
      if (!rounds[round]) rounds[round] = []
      rounds[round].push(m)
    }
    for (const r of Object.keys(rounds)) {
      rounds[r].sort((a, b) => new Date(a.date) - new Date(b.date))
    }
    return {
      rounds,
      roundKeys: Object.keys(rounds).sort((a, b) => Number(a) - Number(b))
    }
  }, [allFixtures])

  const selectedRound = activeRound ?? roundKeys[0] ?? null
  const matchesInRound = selectedRound ? (rounds[selectedRound] || []) : []

  // Unique dates in this round (local timezone)
  const datesInRound = useMemo(() => {
    const seen = new Set()
    return matchesInRound
      .map(m => localDateKey(m.date))
      .filter(d => { if (seen.has(d)) return false; seen.add(d); return true })
  }, [matchesInRound])

  // Reset date filter when round changes
  const handleRoundChange = (r) => { setActiveRound(r); setActiveDate('all') }

  // Group matches by local date
  const matchesByDate = useMemo(() => {
    const map = {}
    for (const m of matchesInRound) {
      const key = localDateKey(m.date)
      if (!map[key]) map[key] = []
      map[key].push(m)
    }
    return map
  }, [matchesInRound])

  // Dates to show based on filter
  const datesToShow = activeDate === 'all' ? datesInRound : [activeDate]

  // Badge counts
  const hlCount = useMemo(() => {
    if (!ytHighlights || !allFixtures) return {}
    const counts = {}
    for (const m of allFixtures) {
      const raw = m.group || ''
      const r = (raw.match(/(\d+)$/) || [])[1] || '1'
      if (!counts[r]) counts[r] = 0
      if (findHighlightForMatch(ytHighlights, m.team1, m.team2)) counts[r]++
    }
    return counts
  }, [allFixtures, ytHighlights])

  const loading = fixturesLoad || ytLoad

  return (
    <div className="page-content page-enter">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--gold)', marginBottom: 4 }}>
          <i className="fa-solid fa-circle-play" style={{ marginRight: 10 }} aria-hidden="true" />
          {lang === 'es' ? 'Resúmenes' : 'Highlights'}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text3)' }}>
          {lang === 'es' ? 'Resúmenes oficiales del Mundial 2026' : 'Official 2026 World Cup highlights'}
        </p>
      </div>

      <ApiStatus loading={loading} error={fixturesErr}
        data={roundKeys.length ? roundKeys : null}
        emptyMessage={lang === 'es' ? 'Los resúmenes aparecerán cuando comiencen los partidos.' : 'Highlights will appear once matches begin.'}
        skeleton="list" skeletonCount={4} skeletonHeight={180}>

        {/* ── Round tabs ── */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16,
          position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)', padding: '8px 0' }}>
          {roundKeys.map(r => {
            const active = selectedRound === r
            const count = hlCount[r]
            return (
              <button key={r} onClick={() => handleRoundChange(r)} style={{
                padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5,
                background: active ? 'var(--gold)' : 'var(--card)',
                color: active ? 'var(--navy)' : 'var(--text3)',
                transition: 'all 0.2s',
                boxShadow: active ? '0 2px 10px rgba(240,180,41,0.35)' : 'none',
              }}>
                {lang === 'es' ? `Jornada ${r}` : `Round ${r}`}
                {count ? (
                  <span style={{
                    fontSize: 10, background: active ? 'rgba(10,14,26,0.2)' : 'rgba(255,255,255,0.08)',
                    padding: '1px 5px', borderRadius: 10,
                  }}>{count}</span>
                ) : null}
              </button>
            )
          })}
        </div>

        {/* ── Date filter tabs ── */}
        {datesInRound.length > 1 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
            <button onClick={() => setActiveDate('all')} style={{
              padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: 11,
              background: activeDate === 'all' ? 'rgba(240,180,41,0.15)' : 'var(--card)',
              color: activeDate === 'all' ? 'var(--gold)' : 'var(--text3)',
              border: activeDate === 'all' ? '1px solid rgba(240,180,41,0.3)' : '1px solid transparent',
              transition: 'all 0.2s',
            }}>
              {lang === 'es' ? 'Todos' : 'All dates'}
            </button>
            {datesInRound.map(d => {
              const active = activeDate === d
              const label = new Date(d + 'T12:00:00').toLocaleDateString(
                lang === 'es' ? 'es-ES' : 'en-US',
                { day: 'numeric', month: 'short' }
              )
              return (
                <button key={d} onClick={() => setActiveDate(d)} style={{
                  padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  fontWeight: 600, fontSize: 11,
                  background: active ? 'rgba(240,180,41,0.15)' : 'var(--card)',
                  color: active ? 'var(--gold)' : 'var(--text3)',
                  border: active ? '1px solid rgba(240,180,41,0.3)' : '1px solid transparent',
                  transition: 'all 0.2s',
                }}>
                  {label}
                </button>
              )
            })}
          </div>
        )}

        {/* ── Matches grouped by date ── */}
        {datesToShow.map(dateKey => {
          const matches = matchesByDate[dateKey] || []
          if (!matches.length) return null
          return (
            <div key={dateKey} style={{ marginBottom: 32 }}>
              {/* Date header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
              }}>
                <div style={{
                  height: 1, flex: 1, background: 'rgba(255,255,255,0.06)',
                }} />
                <h2 style={{
                  fontFamily: 'var(--font-display)', fontSize: 15,
                  color: 'var(--gold)', flexShrink: 0, margin: 0,
                }}>
                  <i className="fa-solid fa-calendar-day" style={{ marginRight: 8, fontSize: 13, opacity: 0.7 }} aria-hidden="true" />
                  {formatDate(dateKey + 'T12:00:00', lang)}
                </h2>
                <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.06)' }} />
              </div>

              {/* Cards grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                {matches.map(match => (
                  <HighlightCard key={match.id} match={match}
                    video={findHighlightForMatch(ytHighlights || [], match.team1, match.team2)}
                    lang={lang} />
                ))}
              </div>
            </div>
          )
        })}
      </ApiStatus>
    </div>
  )
}