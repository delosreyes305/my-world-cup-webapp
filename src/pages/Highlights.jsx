import React, { useState, useMemo } from 'react'
import { useLang } from '../context/LangContext'
import { useApi } from '../hooks/useApi'
import { getAllFixtures } from '../services/sportsService'
import { getWorldCupHighlights, findHighlightForMatch } from '../services/youtubeService'
import YouTubeEmbed from '../components/common/YouTubeEmbed'
import ApiStatus from '../components/common/ApiStatus'

// ─── Flag image via flagcdn ──────────────────────────────
import { TEAM_ISO } from '../services/sportsService'

function Flag({ name, size = 20 }) {
  const iso = TEAM_ISO[name]
  if (!iso) return null
  return (
    <img
      src={`https://flagcdn.com/w40/${iso}.png`}
      alt={name}
      style={{ width: size * 1.4, height: size, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }}
      onError={e => { e.target.style.display = 'none' }}
    />
  )
}

// ─── Single match highlight card ────────────────────────
function HighlightCard({ match, video, lang }) {
  const [playing, setPlaying] = useState(false)
  const hasFT = match.status === 'ft'

  return (
    <div style={{
      background: 'var(--card)',
      borderRadius: 14,
      overflow: 'hidden',
      border: `1.5px solid ${video ? 'rgba(240,180,41,0.2)' : 'rgba(255,255,255,0.05)'}`,
      transition: 'border-color 0.2s, transform 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
    >
      {/* Thumbnail / Player */}
      <div style={{ position: 'relative', aspectRatio: '16/9', background: 'var(--card2)', cursor: video ? 'pointer' : 'default' }}>
        {video ? (
          playing ? (
            <YouTubeEmbed videoId={video.videoId} title={video.title} thumbnail={video.thumbnail} autoplay />
          ) : (
            <>
              {video.thumbnail && (
                <img src={video.thumbnail} alt={video.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              )}
              {/* Play overlay */}
              <div onClick={() => setPlaying(true)} style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.35)',
                transition: 'background 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.5)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.35)' }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 20px rgba(240,180,41,0.4)',
                }}>
                  <i className="fa-solid fa-play" style={{ color: '#0a1628', fontSize: 18, marginLeft: 3 }} aria-hidden="true" />
                </div>
              </div>
            </>
          )
        ) : (
          /* No highlight yet */
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <i className="fa-solid fa-video-slash" style={{ fontSize: 24, color: 'var(--text3)', opacity: 0.4 }} aria-hidden="true" />
            <span style={{ fontSize: 11, color: 'var(--text3)', opacity: 0.5 }}>
              {!hasFT
                ? (lang === 'es' ? 'Pendiente' : 'Upcoming')
                : (lang === 'es' ? 'Resumen próximamente' : 'Highlights coming soon')}
            </span>
          </div>
        )}

        {/* FT score badge */}
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
      </div>

      {/* Match info */}
      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          {/* Home */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
            <Flag name={match.team1} size={14} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {match.team1}
            </span>
          </div>

          {/* VS or score */}
          <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0, fontFamily: 'var(--font-display)' }}>
            {hasFT && match.score1 != null ? `${match.score1}–${match.score2}` : 'vs'}
          </span>

          {/* Away */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right' }}>
              {match.team2}
            </span>
            <Flag name={match.team2} size={14} />
          </div>
        </div>

        {/* Status */}
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {video ? (
            <span style={{ fontSize: 10, color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="fa-solid fa-circle-play" aria-hidden="true" />
              {lang === 'es' ? 'Ver resumen' : 'Watch highlights'}
            </span>
          ) : hasFT ? (
            <span style={{ fontSize: 10, color: 'var(--text3)' }}>
              <i className="fa-solid fa-clock" style={{ marginRight: 4 }} aria-hidden="true" />
              {lang === 'es' ? 'Resumen próximamente' : 'Highlights coming soon'}
            </span>
          ) : (
            <span style={{ fontSize: 10, color: 'var(--text3)' }}>
              {match.time}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────
export default function Highlights() {
  const { lang } = useLang()

  const { data: allFixtures, loading: fixturesLoad, error: fixturesErr } =
    useApi(getAllFixtures, null, { ttl: 300_000 })
  const { data: ytHighlights, loading: ytLoad } =
    useApi(getWorldCupHighlights, null, { ttl: 1_800_000 })

  // Group finished + in-progress matches by group letter
  const { groups, groupKeys } = useMemo(() => {
    if (!allFixtures?.length) return { groups: {}, groupKeys: [] }

    const groups = {}
    for (const m of allFixtures) {
      if (m.status === 'upcoming') continue // Only show played/live
      // group format: "Group Stage - 1" or "Group A" — extract letter/number
      const raw = m.group || ''
      const letter = raw.split(' - ').pop()?.replace('Group ', '').trim() || '?'
      if (!groups[letter]) groups[letter] = []
      groups[letter].push(m)
    }

    // Sort matches within each group by date
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => new Date(a.date) - new Date(b.date))
    }

    const groupKeys = Object.keys(groups).sort()
    return { groups, groupKeys }
  }, [allFixtures])

  const [activeGroup, setActiveGroup] = useState(null)
  // Auto-select first group when data loads
  const selectedGroup = activeGroup ?? groupKeys[0] ?? null

  const loading = fixturesLoad || ytLoad

  return (
    <div className="page-content page-enter">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--gold)', marginBottom: 4 }}>
          <i className="fa-solid fa-circle-play" style={{ marginRight: 10 }} aria-hidden="true" />
          {lang === 'es' ? 'Resúmenes' : 'Highlights'}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text3)' }}>
          {lang === 'es'
            ? 'Resúmenes oficiales de todos los partidos del Mundial 2026'
            : 'Official match highlights from the 2026 World Cup'}
        </p>
      </div>

      <ApiStatus loading={loading} error={fixturesErr} data={groupKeys.length ? groupKeys : null}
        emptyMessage={lang === 'es' ? 'Los resúmenes aparecerán cuando comiencen los partidos.' : 'Highlights will appear once matches begin.'}
        skeleton="list" skeletonCount={6} skeletonHeight={200}>

        {/* Group tabs */}
        <div style={{
          display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20,
          position: 'sticky', top: 0, zIndex: 10,
          background: 'var(--bg)', padding: '8px 0',
        }}>
          {groupKeys.map(g => (
            <button key={g} onClick={() => setActiveGroup(g)}
              style={{
                padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 12,
                background: selectedGroup === g ? 'var(--gold)' : 'var(--card)',
                color: selectedGroup === g ? 'var(--navy)' : 'var(--text3)',
                transition: 'all 0.2s',
                boxShadow: selectedGroup === g ? '0 2px 8px rgba(240,180,41,0.3)' : 'none',
              }}
            >
              {isNaN(g) ? `${lang === 'es' ? 'Grupo' : 'Group'} ${g}` : `${lang === 'es' ? 'Fecha' : 'Round'} ${g}`}
            </button>
          ))}
        </div>

        {/* Matches grid for selected group */}
        {selectedGroup && groups[selectedGroup] && (
          <>
            <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fa-solid fa-film" aria-hidden="true" />
              <span>
                {groups[selectedGroup].filter(m => findHighlightForMatch(ytHighlights || [], m.team1, m.team2)).length}
                {' '}/{' '}
                {groups[selectedGroup].length}
                {' '}{lang === 'es' ? 'resúmenes disponibles' : 'highlights available'}
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}>
              {groups[selectedGroup].map(match => {
                const video = findHighlightForMatch(ytHighlights || [], match.team1, match.team2)
                return (
                  <HighlightCard key={match.id} match={match} video={video} lang={lang} />
                )
              })}
            </div>
          </>
        )}
      </ApiStatus>
    </div>
  )
}