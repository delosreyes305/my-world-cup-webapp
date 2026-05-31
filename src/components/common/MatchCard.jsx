import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'

function TeamFlag({ flag, name, size = 34 }) {
  if (!flag) return <span style={{ fontSize: size * 0.8 }}>🏳️</span>
  if (typeof flag === 'string' && flag.startsWith('http')) {
    return (
      <img
        src={flag} alt={name}
        style={{ width: size, height: size, objectFit: 'contain', borderRadius: 3 }}
        onError={e => { e.target.style.display = 'none' }}
      />
    )
  }
  return <span style={{ fontSize: size * 0.85, lineHeight: 1 }} aria-hidden="true">{flag}</span>
}

export default function MatchCard({ match }) {
  const navigate = useNavigate()
  const { toggleFav, isFav } = useApp()
  const { id, team1, flag1, team2, flag2, score1, score2, status, time, group, venue, stadium } = match

  const statusEl = status === 'live'
    ? <div className="match-live"><span className="live-dot" aria-hidden="true" />{time}</div>
    : status === 'ft'
    ? <div className="match-done">Full Time</div>
    : <div className="match-upcoming">{time}</div>

  const scoreEl = status === 'upcoming'
    ? <span className="score-vs">vs</span>
    : <div className="score-display">
        <span>{score1}</span>
        <span className="score-sep">–</span>
        <span>{score2}</span>
      </div>

  return (
    <article
      className="match-card card card-clickable"
      onClick={() => status === 'live'
        ? navigate(`/live/${id}`, { state: { match } })
        : navigate(`/matches/${id}`, { state: { match } })}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key !== 'Enter') return
        status === 'live'
          ? navigate(`/live/${id}`, { state: { match } })
          : navigate(`/matches/${id}`, { state: { match } })
      }}
      aria-label={`${team1} vs ${team2}${group ? `, ${group}` : ''}`}
    >
      <div className="match-card-meta">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="badge badge-gold">{group || '—'}</span>
          {(venue || stadium) && (
            <span style={{ fontSize: 10, color: 'var(--text3)' }}>
              {[venue, stadium].filter(Boolean).join(' · ')}
            </span>
          )}
        </div>
        {statusEl}
      </div>

      <div className="match-teams">
        <div className="match-team">
          <div className="team-flag-wrap">
            <TeamFlag flag={flag1} name={team1} size={34} />
          </div>
          <div className="team-name-text">{team1}</div>
        </div>

        <div className="match-score-center">{scoreEl}</div>

        <div className="match-team">
          <div className="team-flag-wrap">
            <TeamFlag flag={flag2} name={team2} size={34} />
          </div>
          <div className="team-name-text">{team2}</div>
        </div>
      </div>

      <button
        className={`fav-btn${isFav('matches', id) ? ' active' : ''}`}
        onClick={e => { e.stopPropagation(); toggleFav('matches', { ...match, name: `${team1} vs ${team2}` }) }}
        aria-label={`${isFav('matches', id) ? 'Remove from' : 'Add to'} favorites`}
        style={{ position: 'absolute', bottom: 12, right: 12 }}
      >
        ♥
      </button>
    </article>
  )
}
