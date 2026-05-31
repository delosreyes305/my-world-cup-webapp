import React, { useEffect, useRef, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { useLang } from '../../context/LangContext'
import { useApi } from '../../hooks/useApi'
import { getTeams, getAllFixtures, searchPlayers, IS_MOCK } from '../../services/sportsService'
import { getHeadlines } from '../../services/newsService'
import { TEAMS, PLAYERS, MATCHES } from '../../data/mockData'
import './SearchOverlay.css'

// ── 300 ms debounce ──────────────────────────────────
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

// ── Flag renderer (URL or emoji) ─────────────────────
function Flag({ flag, name, size = 26 }) {
  if (!flag) return <span style={{ fontSize: size }}>🏳️</span>
  if (typeof flag === 'string' && flag.startsWith('http')) {
    return (
      <img src={flag} alt={name}
        style={{ width: size, height: size, objectFit: 'contain', borderRadius: 3 }}
        onError={e => { e.target.style.display = 'none' }}
      />
    )
  }
  return <span style={{ fontSize: size }}>{flag}</span>
}

export default function SearchOverlay() {
  const { searchOpen, setSearchOpen } = useApp()
  const { t, lang } = useLang()
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  const navigate = useNavigate()

  const debouncedQuery = useDebounce(query, 300)
  const q    = debouncedQuery.toLowerCase().trim()   // for API calls
  const qLive = query.toLowerCase().trim()            // for instant client-side filter

  // ── Focus + scroll-lock ──────────────────────────────
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      setQuery('')
    }
  }, [searchOpen])

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') setSearchOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setSearchOpen])

  // ── Load cacheable datasets (load once, reuse) ───────
  const { data: allTeams    } = useApi(getTeams,      { ttl: 3_600_000 })
  const { data: allFixtures } = useApi(getAllFixtures, { ttl: 1_800_000 })
  const { data: headlines   } = useApi(getHeadlines, lang, { ttl: 300_000 })

  // ── Player API search (debounced, min 3 chars) ────────
  const skipPlayerSearch = q.length < 3
  const { data: apiPlayers, loading: playersLoading } = useApi(
    searchPlayers, debouncedQuery,
    { ttl: 60_000, skip: skipPlayerSearch },
  )

  // ── Teams: client-side filter on cached list ──────────
  const teamResults = useMemo(() => {
    if (!qLive) return []
    const source = allTeams || TEAMS
    return source
      .filter(t => t.name.toLowerCase().includes(qLive))
      .slice(0, 5)
  }, [qLive, allTeams])

  // ── Matches: client-side filter on cached list ─────────
  const matchResults = useMemo(() => {
    if (!qLive) return []
    const source = allFixtures || MATCHES
    return source
      .filter(m =>
        m.team1?.toLowerCase().includes(qLive) ||
        m.team2?.toLowerCase().includes(qLive)
      )
      .slice(0, 5)
  }, [qLive, allFixtures])

  // ── Players: API search result (or mock) ──────────────
  const playerResults = useMemo(() => {
    if (!qLive) return []
    if (IS_MOCK) {
      return PLAYERS.filter(p => p.name.toLowerCase().includes(qLive)).slice(0, 5)
    }
    if (q.length < 3) return []   // haven't debounced yet / too short
    return (apiPlayers || []).slice(0, 5)
  }, [qLive, q, apiPlayers])

  // ── News: client-side filter on cached headlines ───────
  const newsResults = useMemo(() => {
    if (!qLive || !headlines) return []
    return headlines
      .filter(a =>
        a.title?.toLowerCase().includes(qLive) ||
        a.excerpt?.toLowerCase().includes(qLive)
      )
      .slice(0, 3)
  }, [qLive, headlines])

  const hasResults = teamResults.length || matchResults.length || playerResults.length || newsResults.length
  const showPlayerSpinner = !IS_MOCK && qLive.length >= 3 && playersLoading && !playerResults.length

  // ── Navigate + close ──────────────────────────────────
  const go = (path, state) => {
    navigate(path, state ? { state } : undefined)
    setSearchOpen(false)
  }

  const goToMatch = m =>
    go(m.status === 'live' ? `/live/${m.id}` : `/matches/${m.id}`, { match: m })

  if (!searchOpen) return null

  const isEs = lang === 'es'

  return (
    <div
      className="search-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      onClick={() => setSearchOpen(false)}
    >
      <div className="search-inner" onClick={e => e.stopPropagation()}>

        {/* ── Search bar ── */}
        <div className="search-bar-wrap">
          <i className="fa-solid fa-magnifying-glass search-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            className="search-input"
            placeholder={t('common', 'search_placeholder')}
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Search"
          />
          {showPlayerSpinner && (
            <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>
              {isEs ? 'Buscando…' : 'Searching…'}
            </span>
          )}
          <button className="search-close" onClick={() => setSearchOpen(false)} aria-label="Close search">✕</button>
        </div>

        {/* ── Results ── */}
        <div className="search-results">

          {!qLive && (
            <p className="search-hint">
              {isEs
                ? 'Escribe para buscar equipos, jugadores, partidos y noticias…'
                : 'Start typing to search teams, players, matches and news…'}
            </p>
          )}

          {qLive && !hasResults && !showPlayerSpinner && (
            <p className="search-no-results">
              {isEs ? `Sin resultados para "${query}"` : `No results for "${query}"`}
            </p>
          )}

          {/* Teams */}
          {teamResults.length > 0 && (
            <div className="search-section">
              <div className="search-section-label">{isEs ? 'Equipos' : 'Teams'}</div>
              {teamResults.map(team => (
                <button
                  key={team.id}
                  className="search-result-item"
                  onClick={() => go(`/teams/${team.id}`, { team })}
                >
                  <span className="result-icon">
                    <Flag flag={team.flag} name={team.name} size={28} />
                  </span>
                  <div>
                    <div className="result-name">{team.name}</div>
                    <div className="result-meta">
                      {team.rank ? `FIFA #${team.rank} · ` : ''}{team.confederation || team.region || ''}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Players */}
          {(playerResults.length > 0 || showPlayerSpinner) && (
            <div className="search-section">
              <div className="search-section-label">{isEs ? 'Jugadores' : 'Players'}</div>
              {showPlayerSpinner && (
                <div style={{ padding: '12px 14px', color: 'var(--text3)', fontSize: 13 }}>
                  {isEs ? 'Buscando jugadores…' : 'Looking up players…'}
                </div>
              )}
              {playerResults.map(p => (
                <button
                  key={p.id}
                  className="search-result-item"
                  onClick={() => go(`/players/${p.id}`, { player: p })}
                >
                  <span className="result-icon">
                    {p.photo
                      ? <img src={p.photo} alt={p.name}
                          style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
                          onError={e => { e.target.outerHTML = '<span>⭐</span>' }}
                        />
                      : (p.emoji || '⭐')
                    }
                  </span>
                  <div>
                    <div className="result-name">{p.name}</div>
                    <div className="result-meta">
                      {p.pos} · {p.nation}{p.club ? ` · ${p.club}` : ''}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Matches */}
          {matchResults.length > 0 && (
            <div className="search-section">
              <div className="search-section-label">{isEs ? 'Partidos' : 'Matches'}</div>
              {matchResults.map(m => (
                <button
                  key={m.id}
                  className="search-result-item"
                  onClick={() => goToMatch(m)}
                >
                  <span className="result-icon" style={{ fontSize: 22 }}>
                    {m.status === 'live' ? '🔴' : m.status === 'ft' ? '✅' : '⚽'}
                  </span>
                  <div>
                    <div className="result-name" style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                      <Flag flag={m.flag1} name={m.team1} size={18} />
                      {m.team1}
                      {m.score1 != null && m.score2 != null
                        ? <strong style={{ color: 'var(--gold)', margin: '0 4px' }}>{m.score1}–{m.score2}</strong>
                        : <span style={{ color: 'var(--text3)', margin: '0 4px' }}>vs</span>
                      }
                      {m.team2}
                      <Flag flag={m.flag2} name={m.team2} size={18} />
                    </div>
                    <div className="result-meta">
                      {m.group}{m.stadium ? ` · ${m.stadium}` : ''}
                      {m.status === 'live' && <span style={{ color: 'var(--red)', marginLeft: 6 }}>● LIVE {m.time}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* News */}
          {newsResults.length > 0 && (
            <div className="search-section">
              <div className="search-section-label">{isEs ? 'Noticias' : 'News'}</div>
              {newsResults.map((a, i) => (
                <button
                  key={a.id || i}
                  className="search-result-item"
                  onClick={() => {
                    setSearchOpen(false)
                    navigate('/news')
                  }}
                >
                  <span className="result-icon" style={{ fontSize: 20 }}>{a.emoji || '📰'}</span>
                  <div>
                    <div className="result-name" style={{
                      display: '-webkit-box', WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {a.title}
                    </div>
                    <div className="result-meta">{a.source}{a.time ? ` · ${a.time}` : ''}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
