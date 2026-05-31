import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { useApp } from '../context/AppContext'
import { useApi } from '../hooks/useApi'
import { getTeams } from '../services/sportsService'
import ApiStatus from '../components/common/ApiStatus'

const CONFEDERATIONS = ['All', 'UEFA', 'CONMEBOL', 'CONCACAF', 'CAF', 'AFC', 'OFC']

const CONF_LABEL = {
  All: 'All Teams',
  UEFA: 'UEFA',
  CONMEBOL: 'CONMEBOL',
  CONCACAF: 'CONCACAF',
  CAF: 'CAF',
  AFC: 'AFC',
  OFC: 'OFC',
}

function TeamFlag({ flag, name, size = 64 }) {
  if (!flag) return <div style={{ fontSize: size * 0.8, width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🏳️</div>
  if (typeof flag === 'string' && flag.startsWith('http')) {
    return (
      <img
        src={flag} alt={name}
        style={{ width: size, height: size, objectFit: 'contain', borderRadius: 4 }}
        onError={e => { e.target.style.display = 'none' }}
      />
    )
  }
  return <span style={{ fontSize: size * 0.75, lineHeight: 1 }} aria-hidden="true">{flag}</span>
}

export default function Teams() {
  const { t, lang }          = useLang()
  const { toggleFav, isFav } = useApp()
  const navigate             = useNavigate()

  const [conf,   setConf  ] = useState('All')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('name')

  const { data: teams, loading, error, refetch } = useApi(getTeams, { ttl: 3_600_000 })

  const filtered = useMemo(() => {
    if (!teams) return []
    return teams
      .filter(tm => conf === 'All' || tm.confederation === conf || tm.region === conf)
      .filter(tm => !search || tm.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name)
        if (sortBy === 'rank') return (a.rank ?? 999) - (b.rank ?? 999)
        if (sortBy === 'confederation') return (a.confederation || '').localeCompare(b.confederation || '')
        return 0
      })
  }, [teams, conf, search, sortBy])

  return (
    <div className="page-content page-enter">

      {/* ── Header ── */}
      <div className="section-header mb-16">
        <h1 className="section-title"><span>{t('nav', 'teams')}</span></h1>
        <select className="select-dark" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="name">{lang === 'es' ? 'Ordenar: A–Z' : 'Sort: A–Z'}</option>
          <option value="confederation">{lang === 'es' ? 'Ordenar: Confederación' : 'Sort: Confederation'}</option>
          <option value="rank">{lang === 'es' ? 'Ordenar: Ranking FIFA' : 'Sort: FIFA Rank'}</option>
        </select>
      </div>

      {/* ── Search ── */}
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <i className="fa-solid fa-magnifying-glass" aria-hidden="true" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--text3)', pointerEvents: 'none' }} />
        <input
          className="input" style={{ paddingLeft: 36 }}
          placeholder={lang === 'es' ? 'Buscar equipo...' : 'Search team...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Search team"
        />
      </div>

      {/* ── Confederation filter ── */}
      <div className="scroll-tabs mb-8" role="tablist" aria-label="Confederation filter">
        {CONFEDERATIONS.map(c => (
          <button key={c}
            className={`scroll-tab${conf === c ? ' active' : ''}`}
            onClick={() => setConf(c)} role="tab" aria-selected={conf === c}>
            {CONF_LABEL[c]}
          </button>
        ))}
      </div>

      {/* ── Result count ── */}
      {!loading && !error && (
        <p className="caption mb-16" style={{ color: 'var(--text3)' }}>
          {filtered.length} {lang === 'es' ? `equipo${filtered.length !== 1 ? 's' : ''}` : `team${filtered.length !== 1 ? 's' : ''}`}
          {conf !== 'All' && ` · ${conf}`}
          {search && ` · "${search}"`}
        </p>
      )}

      {/* ── Team grid ── */}
      <ApiStatus loading={loading} error={error} data={filtered.length ? filtered : null}
        skeleton="grid" skeletonCount={8} skeletonHeight={200}
        onRetry={refetch}
        emptyMessage={lang === 'es' ? 'No se encontraron equipos.' : 'No teams found.'}>
        <div className="grid-4" role="list" aria-label="Teams">
          {filtered.map(team => (
            <article
              key={team.id}
              className="team-card card card-clickable"
              onClick={() => navigate(`/teams/${team.id}`, { state: { team } })}
              role="listitem" tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && navigate(`/teams/${team.id}`, { state: { team } })}
              aria-label={`${team.name}${team.rank ? `, FIFA rank ${team.rank}` : ''}`}
            >
              {/* Flag / Logo */}
              <div className="team-card-flag" aria-hidden="true">
                <TeamFlag flag={team.flag} name={team.name} size={64} />
              </div>

              {/* Name */}
              <h2 className="team-card-name">{team.name}</h2>

              {/* Confederation badge */}
              {team.confederation && (
                <div style={{ marginBottom: 6 }}>
                  <span className="badge" style={{ fontSize: 9, background: 'rgba(240,180,41,0.12)', color: 'var(--gold)', border: '1px solid rgba(240,180,41,0.2)' }}>
                    {team.confederation}
                  </span>
                </div>
              )}

              {/* Venue city */}
              {team.venue?.city && (
                <div className="caption" style={{ fontSize: 11, marginBottom: 8, color: 'var(--text3)' }}>
                  🏟️ {team.venue.city}
                </div>
              )}

              {/* Stats */}
              <div className="team-card-stats" role="list">
                {team.rank ? (
                  <div className="team-stat" role="listitem">
                    <div className="team-stat-val">#{team.rank}</div>
                    <div className="team-stat-lbl">{t('common', 'rank')}</div>
                  </div>
                ) : team.founded ? (
                  <div className="team-stat" role="listitem">
                    <div className="team-stat-val">{team.founded}</div>
                    <div className="team-stat-lbl">{t('common','founded')}</div>
                  </div>
                ) : null}
                <div className="team-stat" role="listitem">
                  <div className="team-stat-val">
                    {team.titles > 0 ? '🏆'.repeat(Math.min(team.titles, 5)) : '—'}
                  </div>
                  <div className="team-stat-lbl">{t('common', 'titles')}</div>
                </div>
                <div className="team-stat" role="listitem">
                  <div className="team-stat-val">{team.pts ?? '—'}</div>
                  <div className="team-stat-lbl">{t('common', 'pts')}</div>
                </div>
              </div>

              <button
                className={`fav-btn${isFav('teams', team.id) ? ' active' : ''}`}
                onClick={e => { e.stopPropagation(); toggleFav('teams', team) }}
                aria-label={isFav('teams', team.id) ? t('favorites','remove') : t('common','add_fav')}
                style={{ marginTop: 12 }}
              >
                ♥
              </button>
            </article>
          ))}
        </div>
      </ApiStatus>

    </div>
  )
}
