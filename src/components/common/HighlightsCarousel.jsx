import React, { useState, useRef, useEffect } from 'react'
import YouTubeEmbed from './YouTubeEmbed'

// ─── HighlightsCarousel ────────────────────────────────
// Horizontal scroll carousel with prev/next arrows and
// dot indicators. Each card shows a YouTube thumbnail +
// match info below. Supports touch/swipe on mobile.

export default function HighlightsCarousel({ highlights, lang }) {
  const [current, setCurrent] = useState(0)
  const trackRef  = useRef(null)
  const startX    = useRef(null)
  const total     = highlights.length

  // Scroll the track to the current slide
  useEffect(() => {
    if (!trackRef.current) return
    const card = trackRef.current.children[current]
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [current])

  const prev = () => setCurrent(c => Math.max(0, c - 1))
  const next = () => setCurrent(c => Math.min(total - 1, c + 1))

  // Touch swipe
  const onTouchStart = e => { startX.current = e.touches[0].clientX }
  const onTouchEnd   = e => {
    if (startX.current === null) return
    const diff = startX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 40) diff > 0 ? next() : prev()
    startX.current = null
  }

  if (!total) return null

  return (
    <div style={{ position: 'relative' }}>

      {/* Track */}
      <div
        ref={trackRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          display: 'flex',
          gap: 12,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          padding: '4px 2px 8px',
        }}
      >
        {highlights.map(({ match, video }, i) => (
          <article
            key={match.id}
            style={{
              flex: '0 0 calc(33.33% - 8px)',
              minWidth: 220,
              maxWidth: 320,
              scrollSnapAlign: 'start',
              borderRadius: 12,
              overflow: 'hidden',
              background: 'var(--card)',
              border: `1.5px solid ${i === current ? 'var(--gold)' : 'rgba(255,255,255,0.06)'}`,
              transition: 'border-color 0.3s',
            }}
          >
            <YouTubeEmbed
              videoId={video.videoId}
              title={video.title}
              thumbnail={video.thumbnail}
            />
            <div style={{ padding: '10px 12px' }}>
              <div className="fw-600" style={{ fontSize: 12, color: 'var(--text)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {match.team1} {match.score1}–{match.score2} {match.team2}
              </div>
              <div className="caption" style={{ fontSize: 10, color: 'var(--text3)' }}>
                {match.group}
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Hide scrollbar webkit */}
      <style>{`.highlights-track::-webkit-scrollbar{display:none}`}</style>

      {/* Prev / Next arrows — only show if more than 3 items */}
      {total > 3 && (
        <>
          <button
            onClick={prev}
            disabled={current === 0}
            aria-label={lang === 'es' ? 'Anterior' : 'Previous'}
            style={{
              position: 'absolute', left: -16, top: '40%', transform: 'translateY(-50%)',
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--card)', border: '1px solid rgba(255,255,255,0.1)',
              color: current === 0 ? 'var(--text3)' : 'var(--text)',
              cursor: current === 0 ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, transition: 'opacity 0.2s',
              opacity: current === 0 ? 0.3 : 1,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            <i className="fa-solid fa-chevron-left" aria-hidden="true" />
          </button>

          <button
            onClick={next}
            disabled={current === total - 1}
            aria-label={lang === 'es' ? 'Siguiente' : 'Next'}
            style={{
              position: 'absolute', right: -16, top: '40%', transform: 'translateY(-50%)',
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--card)', border: '1px solid rgba(255,255,255,0.1)',
              color: current === total - 1 ? 'var(--text3)' : 'var(--text)',
              cursor: current === total - 1 ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, transition: 'opacity 0.2s',
              opacity: current === total - 1 ? 0.3 : 1,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            <i className="fa-solid fa-chevron-right" aria-hidden="true" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {total > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 8 }}>
          {highlights.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Slide ${i + 1}`}
              style={{
                width: i === current ? 18 : 6,
                height: 6,
                borderRadius: 3,
                background: i === current ? 'var(--gold)' : 'rgba(255,255,255,0.2)',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
