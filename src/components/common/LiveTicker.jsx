import React, { useState, useEffect, useMemo } from 'react'
import { useApiPolling, useApi } from '../../hooks/useApi'
import { getLiveMatches, getAllFixtures, getMatchEvents, TEAM_ISO } from '../../services/sportsService'
import { useLang } from '../../context/LangContext'

// Map raw event type/detail → short label (null = skip this event)
function eventLabel(e) {
  const type   = (e.type   || '').toLowerCase()
  const detail = (e.detail || '').toLowerCase()
  if (type === 'goal') {
    if (detail.includes('own'))     return 'OG'
    if (detail.includes('penalty')) return 'PEN'
    return 'GOAL'
  }
  if (type === 'card') {
    if (detail.includes('red'))    return 'RED CARD'
    if (detail.includes('yellow')) return 'YELLOW CARD'
    return null
  }
  if (type === 'subst') return 'SUB'
  if (type === 'var')   return 'VAR'
  return null
}

// Small flag image from flagcdn.com
function TickerFlag({ name }) {
  const iso = TEAM_ISO[name]
  if (!iso) return null
  return (
    <img
      src={`https://flagcdn.com/w40/${iso}.png`}
      alt=""
      className="ticker-flag"
      onError={e => { e.target.style.display = 'none' }}
    />
  )
}

export default function LiveTicker() {
  const { lang } = useLang()

  // ── Live matches (poll every 30 s) ──────────────────
  const { data: liveMatches } = useApiPolling(getLiveMatches, 30_000)
  const hasLive = !!(liveMatches?.length)

  // ── All fixtures (upcoming fallback) ────────────────
  const { data: allFixtures } = useApi(getAllFixtures, { ttl: 1_800_000, skip: hasLive })

  // ── Events for each live match ───────────────────────
  const [eventItems, setEventItems] = useState([])

  useEffect(() => {
    if (!hasLive || !liveMatches?.length) {
      setEventItems([])
      return
    }

    let cancelled = false

    Promise.all(
      liveMatches.map(m =>
        getMatchEvents(m.id)
          .then(evts => ({ m, evts: evts || [] }))
          .catch(()  => ({ m, evts: [] }))
      )
    ).then(results => {
      if (cancelled) return

      const items = []
      results.forEach(({ m, evts }) => {
        const score = `${m.team1} ${m.score1 ?? 0}–${m.score2 ?? 0} ${m.team2}`
        const notable = evts.filter(e => eventLabel(e))

        if (notable.length) {
          notable.forEach(e => {
            const label = eventLabel(e)
            const who   = [e.player, e.team ? `(${e.team})` : null, e.time].filter(Boolean).join(' ')
            items.push(`${label}  ${who}  —  ${score}`)
          })
        } else {
          const elapsed = m.time ? `${m.time}` : ''
          items.push(`${score}${elapsed ? `  ${elapsed}` : ''}`)
        }
      })

      setEventItems(items)
    })

    return () => { cancelled = true }
  }, [hasLive, liveMatches])

  // ── Build ticker content ─────────────────────────────
  const { liveText, upcomingItems, isLive, label, duration } = useMemo(() => {
    // LIVE mode — plain text (unchanged)
    if (hasLive) {
      const items = eventItems.length
        ? eventItems
        : (liveMatches || []).map(m =>
            `${m.team1} ${m.score1 ?? 0}–${m.score2 ?? 0} ${m.team2}  ${m.time ?? ''}`
          )
      const text = items.join('  |  ')
      return {
        liveText: text,
        upcomingItems: [],
        isLive: true,
        label: lang === 'es' ? 'EN VIVO' : 'LIVE',
        duration: Math.max(18, Math.round(text.length / 6)),
      }
    }

    // UPCOMING mode — with flag images
    const upcoming = (allFixtures || [])
      .filter(m => m.status === 'upcoming')
      .sort((a, b) => {
        if (!a.date && !b.date) return 0
        if (!a.date) return 1
        if (!b.date) return -1
        return new Date(a.date) - new Date(b.date)
      })
      .slice(0, 8)

    if (!upcoming.length) return { liveText: '', upcomingItems: [], isLive: false, label: '', duration: 20 }

    const items = upcoming.map(m => {
      const parts = []
      if (m.date) {
        parts.push(new Date(m.date).toLocaleDateString(
          lang === 'es' ? 'es-MX' : 'en-US',
          { month: 'short', day: 'numeric' }
        ))
      }
      if (m.time)    parts.push(m.time)
      if (m.stadium) parts.push(m.stadium)
      return { id: m.id, team1: m.team1, team2: m.team2, meta: parts.join(' · ') }
    })

    return {
      liveText: '',
      upcomingItems: items,
      isLive: false,
      label: lang === 'es' ? 'PRÓXIMOS' : 'UPCOMING',
      duration: Math.max(22, items.length * 9),
    }
  }, [hasLive, eventItems, liveMatches, allFixtures, lang])

  const hasContent = isLive ? !!liveText : upcomingItems.length > 0
  if (!hasContent) return null

  // Render upcoming items — called twice (a/b) for seamless CSS loop
  const renderItems = (prefix) => upcomingItems.map((item, i) => (
    <span key={`${prefix}-${i}`} className="ticker-item">
      <TickerFlag name={item.team1} />
      <span className="ticker-team">{item.team1}</span>
      <span className="ticker-vs"> vs </span>
      <TickerFlag name={item.team2} />
      <span className="ticker-team">{item.team2}</span>
      {item.meta && <span className="ticker-meta"> · {item.meta}</span>}
      <span className="ticker-sep">&nbsp;&nbsp;|&nbsp;&nbsp;</span>
    </span>
  ))

  return (
    <div
      className={`live-ticker${isLive ? '' : ' upcoming-ticker'}`}
      role="marquee"
      aria-label={isLive ? 'Live match updates' : 'Upcoming matches'}
    >
      <div className="ticker-label">
        {isLive && <span className="live-dot" aria-hidden="true" />}
        {label}
      </div>

      <div className="ticker-scroll" aria-hidden="true">
        {isLive ? (
          // Live: plain text, unchanged approach
          <span className="ticker-text" style={{ animationDuration: `${duration}s` }}>
            {liveText}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{liveText}
          </span>
        ) : (
          // Upcoming: flex items with flag images
          <span className="ticker-text ticker-flex" style={{ animationDuration: `${duration}s` }}>
            {renderItems('a')}
            {renderItems('b')}
          </span>
        )}
      </div>
    </div>
  )
}
