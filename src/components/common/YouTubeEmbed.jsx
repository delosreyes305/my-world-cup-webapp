import React, { useState } from 'react'

// ─── YouTubeEmbed ───────────────────────────────────────
// Shows thumbnail with play button. The iframe only loads after
// the user clicks — keeps pages with multiple highlights fast.
export default function YouTubeEmbed({ videoId, title, thumbnail, aspectRatio = '16 / 9' }) {
  const [playing, setPlaying] = useState(false)

  if (!videoId) return null

  if (playing) {
    return (
      <div style={{ position: 'relative', width: '100%', aspectRatio, borderRadius: 10, overflow: 'hidden', background: '#000' }}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
          title={title || 'YouTube video'}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
      </div>
    )
  }

  return (
    <button
      onClick={() => setPlaying(true)}
      aria-label={title ? `${title} — play` : 'Play video'}
      style={{
        position: 'relative', width: '100%', aspectRatio, borderRadius: 10,
        overflow: 'hidden', border: 'none', padding: 0, cursor: 'pointer',
        background: '#000',
      }}
    >
      {thumbnail && (
        <img
          src={thumbnail} alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={e => { e.target.style.display = 'none' }}
        />
      )}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.25)',
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'rgba(255,255,255,0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
        }}>
          <i className="fa-solid fa-play" style={{ color: '#cc0000', fontSize: 18, marginLeft: 2 }} aria-hidden="true" />
        </div>
      </div>
    </button>
  )
}
