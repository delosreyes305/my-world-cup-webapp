import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { useApp } from '../context/AppContext'
import { useApi } from '../hooks/useApi'
import { getAllTeamPlayers, searchPlayers, getTeams, IS_MOCK, TEAM_ISO } from '../services/sportsService'
import ApiStatus from '../components/common/ApiStatus'

const POSITIONS = ['All', 'FW', 'MF', 'DF', 'GK']

// All 48 WC 2026 nations, alphabetically sorted
const COUNTRIES_ALL = ['All', ...Object.keys(TEAM_ISO).sort()]

// ── Simple debounce hook ─────────────────────────────
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

export default function Players() {
  const { t, lang }          = useLang()

  const POS_LABELS = {
    All: lang === 'es' ? 'Todas'       : 'All',
    FW:  lang === 'es' ? 'Delanteros'  : 'Forwards',
    MF:  lang === 'es' ? 'Mediocamps.' : 'Midfielders',
    DF:  lang === 'es' ? 'Defensas'    : 'Defenders',
    GK:  lang === 'es' ? 'Porteros'    : 'Keepers',
  }
  const SORT_OPT = [
    { val: 'alpha',   label: lang === 'es' ? 'A–Z'          : 'A–Z'     },
    { val: 'rating',  label: lang === 'es' ? 'Rating'       : 'Rating'  },
    { val: 'goals',   label: lang === 'es' ? 'Goles'        : 'Goals'   },
    { val: 'assists', label: lang === 'es' ? 'Asistencias'  : 'Assists' },
  ]
  const { toggleFav, isFav } = useApp()
  const navigate             = useNavigate()

  // ── Filters ──────────────────────────────────────────
  const [pos,     setPos    ] = useState('All')
  const [country, setCountry] = useState('All')
  const [sortBy,  setSortBy ] = useState('alpha')
  const [search,  setSearch ] = useState('')

  // Pagination
  const [page, setPage] = useState(1)

  // Debounce search for API calls (400 ms)
  const debouncedSearch = useDebounce(search, 400)

  // ── Load teams list — needed only in API mode to map country name → team ID ──
  const { data: teams } = useApi(getTeams, { ttl: 3_600_000 })

  const countryList = useMemo(() =>
    teams ? [...teams].sort((a, b) => a.name.localeCompare(b.name)) : [],
  [teams])

  // Derive selected team object from country name (API mode only)
  const selectedTeam = useMemo(() => {
    if (country === 'All') return null
    return countryList.find(t => t.name === country) ?? null
  }, [country, countryList])

  // ── Global search mode: no country selected + search ≥ 3 chars (API only) ──
  const isGlobalSearch = !IS_MOCK && country === 'All' && debouncedSearch.trim().length >= 3

  // ── Load players ─────────────────────────────────────
  // Mock: always load all players → filter client-side by country
  // API:  load that team's full squad when a country is selected
  const teamIdToLoad = IS_MOCK ? null : (selectedTeam?.id ?? null)
  const skipTeamLoad = !IS_MOCK && selectedTeam === null
  const { data: teamPlayers, loading: teamLoading, error: teamError, refetch } = useApi(
    getAllTeamPlayers,
    teamIdToLoad,
    { ttl: 3_600_000, skip: skipTeamLoad },
  )

  // ── Global search via API ─────────────────────────────
  const { data: searchResults, loading: searchLoading, error: searchError } = useApi(
    searchPlayers,
    debouncedSearch,
    { ttl: 60_000, skip: !isGlobalSearch || debouncedSearch.trim().length < 3 },
  )

  // Select dataset
  const rawPlayers = isGlobalSearch ? (searchResults || []) : (teamPlayers || [])
  const loading    = isGlobalSearch ? searchLoading : teamLoading
  const error      = isGlobalSearch ? searchError   : teamError

  // Country tab click
  const handleCountrySelect = useCallback((countryName) => {
    setCountry(countryName)
    setPage(1)
    setPos('All')
    setSearch('')
  }, [])

  // ── Client-side filter + sort ─────────────────────────
  const filtered = useMemo(() => {
    let result = rawPlayers.filter(p => pos === 'All' || p.pos === pos)

    // Country filter — client-side in mock mode only
    // (in API mode rawPlayers already contains the selected team's players)
    if (IS_MOCK && country !== 'All') {
      result = result.filter(p => p.nation?.toLowerCase() === country.toLowerCase())
    }

    // Name search in team/mock mode
    if (!isGlobalSearch && search) {
      const q = search.toLowerCase()
      result = result.filter(p => p.name?.toLowerCase().includes(q))
    }

    if (sortBy === 'rating')  return [...result].sort((a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0))
    if (sortBy === 'goals')   return [...result].sort((a, b) => (b.goals || 0) - (a.goals || 0))
    if (sortBy === 'assists') return [...result].sort((a, b) => (b.assists || 0) - (a.assists || 0))
    return result // 'alpha' already sorted by last name from service
  }, [rawPlayers, pos, country, search, sortBy, isGlobalSearch])

  // Client-side pagination
  const PAGE_SIZE        = 20
  const totalPages       = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const displayedPlayers = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Reset to page 1 when any filter changes
  useEffect(() => { setPage(1) }, [pos, country, search, sortBy, debouncedSearch])

  // Show prompt when no players can be loaded yet (API mode, no selection)
  const showPrompt = !IS_MOCK && country === 'All' && debouncedSearch.trim().length < 3

  return (
    <div className="page-content page-enter">

      {/* ── Header ── */}
      <div className="section-header mb-16">
        <h1 className="section-title"><span>{t('nav', 'players')}</span></h1>
        <select className="select-dark" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          {SORT_OPT.map(o => (
            <option key={o.val} value={o.val}>
              {lang === 'es' ? 'Ordenar: ' : 'Sort: '}{o.label}
            </option>
          ))}
        </select>
      </div>

      {/* ── Search bar ── */}
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <i className="fa-solid fa-magnifying-glass" aria-hidden="true" style={{
          position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
          fontSize: 14, color: 'var(--text3)', pointerEvents: 'none',
        }} />
        <input className="input" style={{ paddingLeft: 36 }}
          placeholder={lang === 'es' ? 'Buscar jugador...' : 'Search player...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Search player"
        />
        {isGlobalSearch && searchLoading && (
          <span style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            fontSize: 11, color: 'var(--text3)',
          }}>
            {lang === 'es' ? 'Buscando…' : 'Searching…'}
          </span>
        )}
      </div>

      {/* ── Position filter ── */}
      <div className="scroll-tabs" role="tablist" aria-label={lang === 'es' ? 'Posición' : 'Position'} style={{ marginBottom: 10 }}>
        {POSITIONS.map(p => (
          <button key={p}
            className={`scroll-tab${pos === p ? ' active' : ''}`}
            onClick={() => setPos(p)} role="tab" aria-selected={pos === p}>
            {POS_LABELS[p]}
          </button>
        ))}
      </div>

      {/* ── Country filter — scroll-tabs matching position filter style ── */}
      <div className="scroll-tabs" role="tablist" aria-label={t('common', 'filter_country')} style={{ marginBottom: 20 }}>
        {COUNTRIES_ALL.map(c => (
          <button
            key={c}
            className={`scroll-tab${country === c ? ' active' : ''}`}
            onClick={() => handleCountrySelect(c)}
            role="tab"
            aria-selected={country === c}
          >
            {c !== 'All' && TEAM_ISO[c] && (
              <img
                src={`https://flagcdn.com/w20/${TEAM_ISO[c]}.png`}
                alt=""
                aria-hidden="true"
                style={{
                  width: 16, height: 11, objectFit: 'cover',
                  borderRadius: 1, marginRight: 5,
                  display: 'inline-block', flexShrink: 0,
                  verticalAlign: 'middle',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              />
            )}
            {c === 'All' ? t('common', 'all_countries') : c}
          </button>
        ))}
      </div>

      {/* ── Result count ── */}
      {!loading && !error && !showPrompt && (
        <p className="caption mb-16" style={{ color: 'var(--text3)' }}>
          {isGlobalSearch
            ? `${filtered.length} ${lang === 'es' ? `resultado${filtered.length !== 1 ? 's' : ''}` : `result${filtered.length !== 1 ? 's' : ''}`} — "${debouncedSearch}"`
            : `${filtered.length} ${lang === 'es' ? `jugador${filtered.length !== 1 ? 'es' : ''}` : `player${filtered.length !== 1 ? 's' : ''}`}`
          }
          {country !== 'All' && ` — ${country}`}
          {pos    !== 'All'  && ` · ${POS_LABELS[pos]}`}
          {!isGlobalSearch && search && ` · "${search}"`}
          {!isGlobalSearch && ` · ${lang === 'es' ? `Página ${page} de ${totalPages}` : `Page ${page} of ${totalPages}`}`}
        </p>
      )}

      {/* ── Prompt: select a country or type to search ── */}
      {showPrompt && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text3)' }}>
          <div style={{ fontSize: 40, marginBottom: 16, color: 'var(--gold)' }}>
            <i className="fa-solid fa-flag fa-xl" aria-hidden="true" />
          </div>
          <div className="fw-600" style={{ fontSize: 16, marginBottom: 8, color: 'var(--text)' }}>
            {lang === 'es' ? 'Selecciona un país o busca un jugador' : 'Select a country or search for a player'}
          </div>
          <div style={{ fontSize: 14 }}>
            {lang === 'es'
              ? 'Elige una selección del filtro de arriba, o escribe el nombre de un jugador en el buscador.'
              : 'Choose a team from the filter above, or type a player name in the search bar.'}
          </div>
        </div>
      )}

      {/* ── Player grid ── */}
      {!showPrompt && (
        <ApiStatus loading={loading} error={error}
          data={displayedPlayers.length ? displayedPlayers : null}
          skeleton="grid" skeletonCount={6} skeletonHeight={110}
          onRetry={refetch}
          emptyMessage={
            isGlobalSearch
              ? (lang === 'es' ? `No se encontraron jugadores para "${debouncedSearch}".` : `No players found for "${debouncedSearch}".`)
              : (search || pos !== 'All' || country !== 'All')
                ? (lang === 'es' ? 'No hay jugadores con esos filtros. Prueba otra combinación.' : 'No players match these filters. Try a different combination.')
                : (lang === 'es' ? 'No hay jugadores disponibles.' : 'No players available.')
          }>
          <div className="grid-2" role="list">
            {displayedPlayers.map(player => (
              <article key={player.id} className="card card-clickable player-card-full"
                onClick={() => navigate(`/players/${player.id}`, { state: { player } })}
                role="listitem" tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && navigate(`/players/${player.id}`, { state: { player } })}
                aria-label={`${player.name}, ${player.pos}`}>

                {player.photo ? (
                  <img src={player.photo} alt={player.name}
                    style={{
                      width: 54, height: 54, borderRadius: '50%',
                      border: '2px solid rgba(240,180,41,.2)', objectFit: 'cover', flexShrink: 0,
                    }}
                    onError={e => { e.target.style.display = 'none' }} />
                ) : (
                  <div className="player-avatar-med" aria-hidden="true">{player.emoji}</div>
                )}

                <div className="player-card-info">
                  <div className="fw-600" style={{ fontSize: 15, marginBottom: 2 }}>
                    {player.name}
                    {player.flag && (
                      <span style={{ opacity: .6, fontSize: 13, marginLeft: 4 }}>{player.flag}</span>
                    )}
                  </div>
                  <div className="caption" style={{ marginBottom: 8 }}>
                    <span className="badge badge-blue" style={{ marginRight: 6, fontSize: 9 }}>
                      {player.pos}
                    </span>
                    {player.club && `${player.club} · `}{player.nation} · {player.age} {t('player','yrs')}
                  </div>
                  <div className="flex gap-16">
                    <div className="pstat">
                      <div className="pstat-val">{player.goals}</div>
                      <div className="pstat-lbl">{t('common', 'goals')}</div>
                    </div>
                    <div className="pstat">
                      <div className="pstat-val">{player.assists}</div>
                      <div className="pstat-lbl">{t('common', 'assists')}</div>
                    </div>
                    <div className="pstat">
                      <div className="pstat-val">{player.rating}</div>
                      <div className="pstat-lbl">{t('common', 'rating')}</div>
                    </div>
                  </div>
                </div>

                <button
                  className={`fav-btn${isFav('players', player.id) ? ' active' : ''}`}
                  onClick={e => { e.stopPropagation(); toggleFav('players', player) }}
                  aria-label={lang === 'es'
                    ? `${isFav('players', player.id) ? 'Quitar de' : 'Agregar a'} favoritos`
                    : `${isFav('players', player.id) ? 'Remove from' : 'Add to'} favorites`}>
                  ♥
                </button>
              </article>
            ))}
          </div>
        </ApiStatus>
      )}

      {/* ── Pagination ── */}
      {!showPrompt && !isGlobalSearch && !loading && !error && totalPages > 1 && (
        <div className="flex-center gap-8 mt-24" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-outline btn-sm"
            onClick={() => setPage(1)} disabled={page === 1}
            aria-label={lang === 'es' ? 'Primera página' : 'First page'}>
            ««
          </button>
          <button className="btn btn-outline btn-sm"
            onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            aria-label={lang === 'es' ? 'Página anterior' : 'Previous page'}>
            {lang === 'es' ? '← Anterior' : '← Previous'}
          </button>
          <span className="caption" style={{ padding: '0 12px', minWidth: 100, textAlign: 'center' }}>
            {lang === 'es' ? 'Página' : 'Page'} <strong>{page}</strong> {lang === 'es' ? 'de' : 'of'} <strong>{totalPages}</strong>
          </span>
          <button className="btn btn-outline btn-sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            aria-label={lang === 'es' ? 'Página siguiente' : 'Next page'}>
            {lang === 'es' ? 'Siguiente →' : 'Next →'}
          </button>
          <button className="btn btn-outline btn-sm"
            onClick={() => setPage(totalPages)} disabled={page === totalPages}
            aria-label={lang === 'es' ? 'Última página' : 'Last page'}>
            »»
          </button>
        </div>
      )}

    </div>
  )
}
