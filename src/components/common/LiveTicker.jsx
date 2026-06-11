import React, { useState, useEffect, useMemo } from 'react'
import { useApiPolling, useApi } from '../../hooks/useApi'
import { getLiveMatches, getAllFixtures, getMatchEvents, TEAM_ISO } from '../../services/sportsService'
import { useLang } from '../../context/LangContext'

// Map raw event type/detail → short label (null = skip this event)
function eventLabel(e, lang = 'en') {
  const type   = (e.type   || '').toLowerCase()
  const detail = (e.detail || '').toLowerCase()
  if (type === 'goal') {
    if (detail.includes('own'))     return lang === 'es' ? 'AUTOGOL' : 'OWN GOAL'
    if (detail.includes('penalty')) return lang === 'es' ? 'GOL DE PENAL' : 'PENALTY GOAL'
    return lang === 'es' ? 'GOL' : 'GOAL'
  }
  if (type === 'card') {
    if (detail.includes('red'))    return lang === 'es' ? 'TARJETA ROJA'    : 'RED CARD'
    if (detail.includes('yellow')) return lang === 'es' ? 'TARJETA AMARILLA' : 'YELLOW CARD'
    return null
  }
  if (type === 'subst') return lang === 'es' ? 'CAMBIO' : 'SUBSTITUTION'
  if (type === 'var')   return 'VAR'
  return null
}

// Map raw event type/detail → { icon, color } for display
function eventIcon(e) {
  const type   = (e.type   || '').toLowerCase()
  const detail = (e.detail || '').toLowerCase()
  if (type === 'goal') {
    if (detail.includes('own')) return { icon: 'fa-solid fa-futbol',          color: 'var(--red)' }
    return { icon: 'fa-solid fa-futbol', color: 'var(--green)' }
  }
  if (type === 'card') {
    if (detail.includes('red'))    return { icon: 'card', color: 'var(--red)' }
    if (detail.includes('yellow')) return { icon: 'card', color: '#f0b429' }
    return { icon: 'card', color: 'var(--text3)' }
  }
  if (type === 'subst') return { icon: 'fa-solid fa-arrow-right-arrow-left', color: 'var(--electric)' }
  if (type === 'var')   return { icon: 'fa-solid fa-tv',                     color: 'var(--text3)' }
  return { icon: 'fa-solid fa-circle-dot', color: 'var(--red)' }
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
        const notable = evts.filter(e => eventLabel(e, lang))

        if (notable.length) {
          notable.forEach(e => {
            const label = eventLabel(e, lang)
            const { icon, color } = eventIcon(e)
            const who = [e.player, e.time].filter(Boolean).join(' · ')
            items.push({ icon, color, label, who, team: e.team, score })
          })
        } else {
          items.push({
            icon: 'fa-solid fa-circle-dot', color: 'var(--red)',
            label: null, who: m.time || '', team: null, score,
          })
        }
      })

      setEventItems(items)
    })

    return () => { cancelled = true }
  }, [hasLive, liveMatches])

  // ── Build ticker content ─────────────────────────────
  const { liveItems, upcomingItems, isLive, label, duration } = useMemo(() => {
    // LIVE mode — items with icons
    if (hasLive) {
      const items = eventItems.length
        ? eventItems
        : (liveMatches || []).map(m => ({
            icon: 'fa-solid fa-circle-dot', color: 'var(--red)',
            label: null, who: m.time || '',
            score: `${m.team1} ${m.score1 ?? 0}–${m.score2 ?? 0} ${m.team2}`,
          }))
      const approxLen = items.reduce((acc, it) =>
        acc + (it.label?.length || 0) + (it.who?.length || 0) + it.score.length + 8, 0)
      return {
        liveItems: items,
        upcomingItems: [],
        isLive: true,
        label: lang === 'es' ? 'EN VIVO' : 'LIVE',
        duration: Math.max(18, Math.round(approxLen / 6)),
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

    if (!upcoming.length) return { liveItems: [], upcomingItems: [], isLive: false, label: '', duration: 20 }

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
      liveItems: [],
      upcomingItems: items,
      isLive: false,
      label: lang === 'es' ? 'PRÓXIMOS' : 'UPCOMING',
      duration: Math.max(22, items.length * 9),
    }
  }, [hasLive, eventItems, liveMatches, allFixtures, lang])

  const hasContent = isLive ? liveItems.length > 0 : upcomingItems.length > 0
  if (!hasContent) return null

  // Render live items — icon + (label + player) + score, called twice (a/b) for seamless loop
  const renderLiveItems = (prefix) => liveItems.map((item, i) => (
    <span key={`${prefix}-${i}`} className="ticker-item">
      {item.icon === 'card'
        ? <span
            aria-hidden="true"
            style={{
              display: 'inline-block', width: 9, height: 12, borderRadius: 2,
              background: item.color, transform: 'rotate(-8deg)', flexShrink: 0,
              boxShadow: '0 0 0 1px rgba(0,0,0,0.25)',
            }}
          />
        : <i className={item.icon} style={{ color: item.color, fontSize: 12, flexShrink: 0 }} aria-hidden="true" />
      }
      {item.label && <span className="ticker-team" style={{ color: item.color }}>{item.label}</span>}
      {item.who && <span className="ticker-meta">{item.who}</span>}
      <span className="ticker-vs">—</span>
      <span className="ticker-team">{item.score}</span>
      <span className="ticker-sep">&nbsp;&nbsp;|&nbsp;&nbsp;</span>
    </span>
  ))

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
        <span className="ticker-text ticker-flex" style={{ animationDuration: `${duration}s` }}>
          {isLive ? (
            <>
              {renderLiveItems('a')}
              {renderLiveItems('b')}
            </>
          ) : (
            <>
              {renderItems('a')}
              {renderItems('b')}
            </>
          )}
        </span>
      </div>
    </div>
  )
}