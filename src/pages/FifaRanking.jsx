import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { useApi } from '../hooks/useApi'
import { getTeams, TEAM_ISO, TEAM_METADATA } from '../services/sportsService'
import { TEAMS } from '../data/mockData'

// Confederation color accents
const CONF_COLOR = {
  UEFA:      'var(--blue)',
  CONMEBOL:  '#22c55e',
  CONCACAF:  '#f97316',
  CAF:       '#a78bfa',
  AFC:       '#06b6d4',
  OFC:       '#ec4899',
}

function FlagImg({ name }) {
  const iso = TEAM_ISO[name]
  if (!iso) return null
  return (
    <img
      src={`https://flagcdn.com/w40/${iso}.png`}
      alt={name}
      style={{ width: 38, height: 26, objectFit: 'cover', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)', display: 'block', flexShrink: 0 }}
      onError={e => { e.target.style.display = 'none' }}
    />
  )
}

export default function FifaRanking() {
  const { t, lang } = useLang()
  const navigate    = useNavigate()

  const { data: teamsRaw, loading } = useApi(getTeams, { ttl: 3_600_000 })
  const [showAll, setShowAll] = useState(false)
  const PREVIEW = 10

  const teams = useMemo(() => {
    const source = teamsRaw?.length ? teamsRaw : TEAMS
    return [...source]
      .filter(t => t.rank)
      .sort((a, b) => a.rank - b.rank)
  }, [teamsRaw])

  const visible = showAll ? teams : teams.slice(0, PREVIEW)

  return (
    <div className="page-content page-enter">

      {/* ── Header ── */}
      <div className="section-header mb-16">
        <h1 className="section-title">
          <span>{lang === 'es' ? 'Ranking FIFA' : 'FIFA Ranking'}</span>
        </h1>
        <span className="badge">
          {lang === 'es' ? 'WC 2026 · 48 equipos' : 'WC 2026 · 48 teams'}
        </span>
      </div>

      {/* ── Subtitle ── */}
      <p className="caption mb-16" style={{ color: 'var(--text3)', fontSize: 12 }}>
        {lang === 'es'
          ? 'Clasificación FIFA aproximada de los 48 selecciones clasificadas al Mundial 2026.'
          : 'Approximate FIFA rankings for all 48 qualified nations at the 2026 World Cup.'}
      </p>

      {/* ── Table ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

        {/* Column headers */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '8px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.02)',
        }}>
          <div style={{ width: 28, flexShrink: 0 }} />
          <div style={{ width: 38, flexShrink: 0 }} />
          <div className="caption" style={{ flex: 1, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)' }}>
            {lang === 'es' ? 'Selección' : 'Nation'}
          </div>
          <div className="caption" style={{ width: 70, textAlign: 'center', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', flexShrink: 0 }}>
            {lang === 'es' ? 'Conf.' : 'Conf.'}
          </div>
          <div className="caption" style={{ width: 48, textAlign: 'center', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', flexShrink: 0 }}>
            WC
          </div>
        </div>

        {/* Skeleton */}
        {loading && teams.length === 0 && (
          Array.from({ length: 12 }, (_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="skeleton" style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0 }} />
              <div className="skeleton" style={{ width: 38, height: 26, borderRadius: 4, flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div className="skeleton" style={{ width: '50%', height: 13, borderRadius: 4 }} />
                <div className="skeleton" style={{ width: '30%', height: 10, borderRadius: 3 }} />
              </div>
              <div className="skeleton" style={{ width: 56, height: 20, borderRadius: 10, flexShrink: 0 }} />
              <div className="skeleton" style={{ width: 36, height: 20, borderRadius: 4, flexShrink: 0 }} />
            </div>
          ))
        )}

        {/* Rows */}
        {visible.map((team, i) => {
          const confColor = CONF_COLOR[team.confederation] || 'var(--text3)'
          const isTop3   = i < 3

          return (
            <button
              key={team.id}
              className="card-clickable"
              onClick={() => navigate(`/teams/${team.id}`)}
              style={{
                width: '100%', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px',
                background: isTop3 ? `rgba(240,180,41,${0.06 - i * 0.015})` : 'transparent',
                borderLeft: isTop3 ? '3px solid var(--gold)' : '3px solid transparent',
                borderBottom: i < visible.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                transition: 'background 0.2s, transform 0.2s cubic-bezier(0.4,0,0.2,1)',
              }}
            >
              {/* Rank badge */}
              <div style={{
                width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
                background: i === 0 ? 'var(--gold-grad)' : 'rgba(255,255,255,0.06)',
                color: i === 0 ? 'var(--navy)' : 'var(--text3)',
              }}>
                {team.rank}
              </div>

              {/* Flag */}
              <FlagImg name={team.name} />

              {/* Name + confederation */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="fw-600" style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text)' }}>
                  {team.name}
                </div>
                <div className="caption" style={{ fontSize: 10, color: 'var(--text3)' }}>
                  {team.confederation}
                </div>
              </div>

              {/* Confederation pill */}
              <div style={{
                width: 70, flexShrink: 0, textAlign: 'center',
                fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
                padding: '3px 6px', borderRadius: 10,
                color: confColor,
                background: `${confColor}18`,
                border: `1px solid ${confColor}30`,
              }}>
                {team.confederation}
              </div>

              {/* WC titles */}
              <div style={{ width: 48, flexShrink: 0, textAlign: 'center' }}>
                {team.titles > 0 ? (
                  <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 700 }}>
                    {team.titles}× 🏆
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>—</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Expand / collapse button ── */}
      {teams.length > PREVIEW && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button
            className="btn btn-outline"
            onClick={() => setShowAll(v => !v)}
            style={{ gap: 8, display: 'inline-flex', alignItems: 'center' }}
          >
            <i className={`fa-solid fa-chevron-${showAll ? 'up' : 'down'}`} aria-hidden="true" />
            {showAll
              ? (lang === 'es' ? 'Ver menos' : 'Show less')
              : (lang === 'es'
                  ? `Ver ranking completo (${teams.length - PREVIEW} más)`
                  : `See full ranking (${teams.length - PREVIEW} more)`)}
          </button>
        </div>
      )}

    </div>
  )
}
