// ─── Sports Service — API-Football v3 ───────────────
// league=1  season=2026  →  FIFA World Cup 2026
// Docs: https://www.api-football.com/documentation-v3
//
// Si no hay clave en .env → usa mockData automáticamente.

import { get } from './http.js'
import {
  MATCHES, TEAMS, PLAYERS, GROUPS,
} from '../data/mockData.js'

// In dev: Vite proxy at /api/football → v3.football.api-sports.io (bypasses CORS)
// In prod: Vercel rewrite at /api/football → v3.football.api-sports.io (same bypass)
const BASE = import.meta.env.VITE_FOOTBALL_API_KEY
  ? '/api/football'
  : null
const KEY  = import.meta.env.VITE_FOOTBALL_API_KEY || ''

// ─── ¿Modo mock? ─────────────────────────────────────
const isMock = !KEY || KEY === 'TU_CLAVE_AQUI'
/** Expuesto para que los componentes puedan ajustar su UI según el modo */
export const IS_MOCK = isMock

const headers = { 'x-apisports-key': KEY }

const WC_LEAGUE  = 1
const WC_SEASON  = 2026

// ─── Squad cache — memory + localStorage ─────────────
// Memory cache: fast lookups this session.
// localStorage: persists across sessions and browsers (Safari included).
// Only stores the compact fields needed for search to keep storage small.
const squadCache    = new Map() // teamId (number) → Player[]
let   preloadStarted = false

const LS_KEY = 'wc2026_squads_v1'
const LS_TTL = 6 * 60 * 60 * 1000   // 6 hours

// Compact player shape stored in localStorage (search-relevant fields only)
const compactPlayer = p => ({
  id: p.id, name: p.name, pos: p.pos, nation: p.nation,
  photo: p.photo, emoji: p.emoji, age: p.age, club: p.club,
})

function hydrateFromStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return
    const { ts, data } = JSON.parse(raw)
    if (Date.now() - ts > LS_TTL) { localStorage.removeItem(LS_KEY); return }
    for (const [id, players] of Object.entries(data)) {
      if (!squadCache.has(Number(id))) squadCache.set(Number(id), players)
    }
  } catch { /* ignore */ }
}

function persistToStorage() {
  try {
    const data = {}
    for (const [id, players] of squadCache.entries()) {
      data[id] = players.map(compactPlayer)
    }
    localStorage.setItem(LS_KEY, JSON.stringify({ ts: Date.now(), data }))
  } catch { /* storage full — skip silently */ }
}

// Hydrate on module load — Safari picks up Chrome's cached data instantly
hydrateFromStorage()

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

/** Convierte status code de la API → 'live' | 'ft' | 'upcoming' */
function mapStatus(short) {
  const live     = ['1H','2H','HT','ET','BT','P','INT','LIVE']
  const finished = ['FT','AET','PEN']
  if (live.includes(short))     return 'live'
  if (finished.includes(short)) return 'ft'
  return 'upcoming'
}

// ─────────────────────────────────────────────────────
// PARTIDOS
// ─────────────────────────────────────────────────────

/** Partidos en vivo del Mundial */
export async function getLiveMatches() {
  if (isMock) return MATCHES.filter(m => m.status === 'live')

  const data = await get(
    `${BASE}/fixtures?live=all&league=${WC_LEAGUE}`,
    { headers }
  )
  return (data.response || []).map(normalizeFixture)
}

/** Partidos por fecha (default: hoy) */
export async function getMatchesByDate(date = todayISO()) {
  if (isMock) return MATCHES

  const data = await get(
    `${BASE}/fixtures?date=${date}&league=${WC_LEAGUE}&season=${WC_SEASON}&timezone=America/New_York`,
    { headers }
  )
  return (data.response || []).map(normalizeFixture)
}

/** Todos los partidos del torneo */
export async function getAllFixtures() {
  if (isMock) return MATCHES

  const data = await get(
    `${BASE}/fixtures?league=${WC_LEAGUE}&season=${WC_SEASON}`,
    { headers }
  )
  return (data.response || []).map(normalizeFixture)
}

/** Estadísticas de un partido */
export async function getMatchStats(fixtureId) {
  if (isMock) return MOCK_STATS

  const data = await get(
    `${BASE}/fixtures/statistics?fixture=${fixtureId}`,
    { headers }
  )
  return normalizeStats(data.response || [])
}

/** Eventos (goles, tarjetas, cambios) de un partido */
export async function getMatchEvents(fixtureId) {
  if (isMock) return MOCK_EVENTS

  const data = await get(
    `${BASE}/fixtures/events?fixture=${fixtureId}`,
    { headers }
  )
  return (data.response || []).map(e => {
    const elapsed = e.time?.elapsed ?? ''
    const extra   = e.time?.extra
    const timeStr = extra ? `${elapsed}+${extra}'` : `${elapsed}'`
    return {
      time:   timeStr,
      type:   e.type,
      detail: e.detail,
      team:   e.team?.name,
      player: e.player?.name,
    }
  })
}

// ─────────────────────────────────────────────────────
// TABLA DE POSICIONES
// ─────────────────────────────────────────────────────

export async function getStandings() {
  if (isMock) return GROUPS

  const data = await get(
    `${BASE}/standings?league=${WC_LEAGUE}&season=${WC_SEASON}`,
    { headers }
  )
  return normalizeStandings(data.response || [])
}

// ─────────────────────────────────────────────────────
// EQUIPOS
// ─────────────────────────────────────────────────────

/**
 * Static FIFA rank + WC title data for all 48 WC 2026 teams.
 * Exported so components can use it as a reliable fallback lookup
 * when the team object came from stale navigation state or cache.
 *
 * FIFA rankings change monthly; this is an approximate snapshot for 2026.
 * WC titles are historical facts that never change.
 * Keyed by the exact team name returned by the API.
 */
export const TEAM_METADATA = {
  // Official FIFA Rankings — June 8, 2026 (based on April 1, 2026 official update)
  // ── UEFA ──────────────────────────────────────────────
  France:                 { rank:  3, titles: 2 },
  Spain:                  { rank:  2, titles: 1 },
  England:                { rank:  4, titles: 1 },
  Portugal:               { rank:  5, titles: 0 },
  Netherlands:            { rank:  8, titles: 0 },
  Belgium:                { rank:  9, titles: 0 },
  Germany:                { rank: 10, titles: 4 },
  Croatia:                { rank: 11, titles: 0 },
  Switzerland:            { rank: 19, titles: 0 },
  Austria:                { rank: 24, titles: 0 },
  Sweden:                 { rank: 38, titles: 0 },
  'Czech Republic':       { rank: 39, titles: 0 },
  Czechia:                { rank: 39, titles: 0 },
  'Türkiye':              { rank: 22, titles: 0 },
  Norway:                 { rank: 31, titles: 0 },
  Scotland:               { rank: 42, titles: 0 },
  'Bosnia & Herzegovina': { rank: 64, titles: 0 },
  // ── CONMEBOL ──────────────────────────────────────────
  Argentina:              { rank:  1, titles: 3 },
  Brazil:                 { rank:  6, titles: 5 },
  Colombia:               { rank: 13, titles: 0 },
  Uruguay:                { rank: 16, titles: 2 },
  Ecuador:                { rank: 23, titles: 0 },
  Paraguay:               { rank: 40, titles: 0 },
  // ── CONCACAF ──────────────────────────────────────────
  USA:                    { rank: 17, titles: 0 },
  Mexico:                 { rank: 14, titles: 0 },
  Canada:                 { rank: 30, titles: 0 },
  Panama:                 { rank: 34, titles: 0 },
  'Curaçao':              { rank: 82, titles: 0 },
  Haiti:                  { rank: 83, titles: 0 },
  // ── CAF ───────────────────────────────────────────────
  Morocco:                { rank:  7, titles: 0 },
  Senegal:                { rank: 15, titles: 0 },
  Algeria:                { rank: 28, titles: 0 },
  Egypt:                  { rank: 29, titles: 0 },
  'Ivory Coast':          { rank: 33, titles: 0 },
  Tunisia:                { rank: 46, titles: 0 },
  'DR Congo':             { rank: 45, titles: 0 },
  'Cape Verde':           { rank: 67, titles: 0 },
  Ghana:                  { rank: 73, titles: 0 },
  'South Africa':         { rank: 60, titles: 0 },
  // ── AFC ───────────────────────────────────────────────
  Japan:                  { rank: 18, titles: 0 },
  Iran:                   { rank: 21, titles: 0 },
  'South Korea':          { rank: 25, titles: 0 },
  Australia:              { rank: 27, titles: 0 },
  Qatar:                  { rank: 57, titles: 0 },
  'Saudi Arabia':         { rank: 61, titles: 0 },
  Iraq:                   { rank: 56, titles: 0 },
  Uzbekistan:             { rank: 50, titles: 0 },
  Jordan:                 { rank: 63, titles: 0 },
  // ── OFC ───────────────────────────────────────────────
  'New Zealand':          { rank: 85, titles: 0 },
}

/** ISO 3166-1 alpha-2 codes for flagcdn.com — keys match TEAM_METADATA */
export const TEAM_ISO = {
  // UEFA
  Argentina: 'ar',   Spain: 'es',      France: 'fr',     England: 'gb-eng',
  Portugal: 'pt',    Netherlands: 'nl', Belgium: 'be',    Germany: 'de',
  Croatia: 'hr',     Switzerland: 'ch', Sweden: 'se',     Austria: 'at',
  'Czech Republic': 'cz', Czechia: 'cz', Scotland: 'gb-sct', Norway: 'no', 'Türkiye': 'tr',
  'Bosnia & Herzegovina': 'ba',
  // CONMEBOL
  Brazil: 'br', Colombia: 'co', Uruguay: 'uy', Ecuador: 'ec', Paraguay: 'py',
  // CONCACAF
  USA: 'us', Mexico: 'mx', Canada: 'ca', Panama: 'pa', 'Curaçao': 'cw', Haiti: 'ht',
  // CAF
  Morocco: 'ma', Senegal: 'sn', Algeria: 'dz', Tunisia: 'tn', Egypt: 'eg',
  'Ivory Coast': 'ci', 'Congo DR': 'cd', Ghana: 'gh', 'South Africa': 'za',
  'Cape Verde Islands': 'cv',
  // AFC
  Japan: 'jp', 'South Korea': 'kr', Iran: 'ir', Australia: 'au',
  Jordan: 'jo', Uzbekistan: 'uz', Iraq: 'iq', Qatar: 'qa', 'Saudi Arabia': 'sa',
  // OFC
  'New Zealand': 'nz',
}

/** Static confederation mapping for all 48 WC 2026 teams */
const CONFEDERATION_MAP = {
  // UEFA – 16
  Belgium: 'UEFA', France: 'UEFA', Croatia: 'UEFA', Sweden: 'UEFA',
  Switzerland: 'UEFA', 'Czech Republic': 'UEFA', Czechia: 'UEFA', Austria: 'UEFA',
  'Türkiye': 'UEFA', Norway: 'UEFA', Scotland: 'UEFA',
  'Bosnia & Herzegovina': 'UEFA', Netherlands: 'UEFA', Germany: 'UEFA',
  Spain: 'UEFA', England: 'UEFA', Portugal: 'UEFA',
  // CONMEBOL – 6
  Brazil: 'CONMEBOL', Uruguay: 'CONMEBOL', Colombia: 'CONMEBOL',
  Argentina: 'CONMEBOL', Paraguay: 'CONMEBOL', Ecuador: 'CONMEBOL',
  // CONCACAF – 6
  Panama: 'CONCACAF', Mexico: 'CONCACAF', USA: 'CONCACAF',
  Haiti: 'CONCACAF', Canada: 'CONCACAF', 'Curaçao': 'CONCACAF',
  // CAF – 10
  Senegal: 'CAF', Morocco: 'CAF', Egypt: 'CAF', 'Ivory Coast': 'CAF',
  Ghana: 'CAF', 'Congo DR': 'CAF', 'South Africa': 'CAF',
  Algeria: 'CAF', 'Cape Verde Islands': 'CAF', Tunisia: 'CAF',
  // AFC – 9
  Japan: 'AFC', 'South Korea': 'AFC', Australia: 'AFC', Iran: 'AFC',
  'Saudi Arabia': 'AFC', Jordan: 'AFC', Iraq: 'AFC',
  Uzbekistan: 'AFC', Qatar: 'AFC',
  // OFC – 1
  'New Zealand': 'OFC',
}

// ─── National team home stadiums (ground-truth fallback) ────────────────
// The API often returns empty or inconsistent venue data for national teams.
// These are the official home grounds used in WC 2026 qualification.
const NATIONAL_STADIUMS = {
  // UEFA
  Argentina:              { name: 'Estadio Monumental',          city: 'Buenos Aires',   capacity: 84567 },
  Spain:                  { name: 'Estadio de La Cartuja',       city: 'Seville',        capacity: 57619 },
  France:                 { name: 'Stade de France',             city: 'Saint-Denis',    capacity: 80698 },
  England:                { name: 'Wembley Stadium',             city: 'London',         capacity: 90000 },
  Portugal:               { name: 'Estádio da Luz',              city: 'Lisbon',         capacity: 64642 },
  Netherlands:            { name: 'Johan Cruyff Arena',          city: 'Amsterdam',      capacity: 54990 },
  Belgium:                { name: 'Stade Roi Baudouin',          city: 'Brussels',       capacity: 50093 },
  Germany:                { name: 'Allianz Arena',               city: 'Munich',         capacity: 75024 },
  Croatia:                { name: 'Stadion Maksimir',            city: 'Zagreb',         capacity: 35123 },
  Switzerland:            { name: 'Wankdorf Stadium',            city: 'Berne',          capacity: 31783 },
  Sweden:                 { name: 'Friends Arena',               city: 'Stockholm',      capacity: 50000 },
  Austria:                { name: 'Ernst Happel Stadion',        city: 'Vienna',         capacity: 48500 },
  'Czech Republic':       { name: 'Sinobo Stadium',              city: 'Prague',         capacity: 20814 },
  Czechia:                { name: 'Sinobo Stadium',              city: 'Prague',         capacity: 20814 },
  Scotland:               { name: 'Hampden Park',                city: 'Glasgow',        capacity: 52063 },
  Norway:                 { name: 'Ullevaal Stadion',            city: 'Oslo',           capacity: 27182 },
  'Türkiye':              { name: 'Atatürk Olympic Stadium',     city: 'Istanbul',       capacity: 76092 },
  'Bosnia & Herzegovina': { name: 'Bilino Polje',                city: 'Zenica',         capacity: 15700 },
  // CONMEBOL
  Brazil:                 { name: 'Estádio do Maracanã',         city: 'Rio de Janeiro', capacity: 78838 },
  Colombia:               { name: 'Estadio Metropolitano',       city: 'Barranquilla',   capacity: 48000 },
  Uruguay:                { name: 'Estadio Centenario',          city: 'Montevideo',     capacity: 60235 },
  Ecuador:                { name: 'Estadio Rodrigo Paz Delgado', city: 'Quito',          capacity: 41575 },
  Paraguay:               { name: 'Estadio Defensores del Chaco',city: 'Asunción',       capacity: 42354 },
  // CONCACAF
  USA:                    { name: 'Rose Bowl',                   city: 'Pasadena, CA',   capacity: 90888 },
  Mexico:                 { name: 'Estadio Azteca',              city: 'Mexico City',    capacity: 87523 },
  Canada:                 { name: 'BMO Field',                   city: 'Toronto, ON',    capacity: 30000 },
  Panama:                 { name: 'Estadio Rommel Fernández',    city: 'Panama City',    capacity: 32000 },
  'Curaçao':              { name: 'Ergilio Hato Stadion',        city: 'Willemstad',     capacity: 10000 },
  Haiti:                  { name: 'Stade Sylvio Cator',          city: 'Port-au-Prince', capacity: 10000 },
  // CAF
  Morocco:                { name: 'Stade Mohammed V',            city: 'Casablanca',     capacity: 67000 },
  Senegal:                { name: 'Stade Abdoulaye Wade',        city: 'Dakar',          capacity: 50000 },
  Algeria:                { name: 'Stade Mustapha Tchaker',      city: 'Blida',          capacity: 50000 },
  Tunisia:                { name: 'Stade de Radès',              city: 'Tunis',          capacity: 60000 },
  Egypt:                  { name: 'Cairo International Stadium', city: 'Cairo',          capacity: 75000 },
  'Ivory Coast':          { name: 'Stade Félix Houphouët-Boigny',city: 'Abidjan',        capacity: 45000 },
  'Congo DR':             { name: 'Stade des Martyrs',           city: 'Kinshasa',       capacity: 80000 },
  Ghana:                  { name: 'Baba Yara Stadium',           city: 'Kumasi',         capacity: 40000 },
  'South Africa':         { name: 'FNB Stadium',                 city: 'Johannesburg',   capacity: 94736 },
  'Cape Verde Islands':   { name: 'Estádio Nacional de Cabo Verde',city: 'Praia',        capacity: 15000 },
  // AFC
  Japan:                  { name: 'Japan National Stadium',      city: 'Tokyo',          capacity: 68000 },
  'South Korea':          { name: 'Seoul World Cup Stadium',     city: 'Seoul',          capacity: 66806 },
  Iran:                   { name: 'Azadi Stadium',               city: 'Tehran',         capacity: 78116 },
  Australia:              { name: 'Stadium Australia',           city: 'Sydney',         capacity: 83500 },
  Jordan:                 { name: 'King Abdullah II Stadium',    city: 'Amman',          capacity: 25000 },
  Uzbekistan:             { name: 'Pakhtakor Stadium',           city: 'Tashkent',       capacity: 34000 },
  Iraq:                   { name: 'Franso Hariri Stadium',       city: 'Erbil',          capacity: 65000 },
  Qatar:                  { name: 'Lusail Stadium',              city: 'Lusail',         capacity: 89000 },
  'Saudi Arabia':         { name: 'King Fahd International Stadium',city: 'Riyadh',      capacity: 67000 },
  // OFC
  'New Zealand':          { name: 'Eden Park',                   city: 'Auckland',       capacity: 48276 },
}

/**
 * Fetch live FIFA rankings from API-Football.
 * Returns a map of { teamName: rankPosition } for all ranked teams.
 * Falls back to null if the endpoint is unavailable (plan restriction, etc.)
 */
async function _getFifaRankMap() {
  try {
    const data = await get(
      `${BASE}/teams/rankings?type=FIFA`,
      { headers }
    )
    if (!data.response?.length) return null
    const map = {}
    for (const item of data.response) {
      if (item.team?.name && item.ranking?.position) {
        map[item.team.name] = item.ranking.position
      }
    }
    return Object.keys(map).length ? map : null
  } catch {
    return null  // silently fall back to TEAM_METADATA
  }
}

export async function getTeams() {
  if (isMock) return TEAMS

  // Fetch teams and FIFA rankings in parallel — rankings call is best-effort
  const [teamsData, rankMap] = await Promise.all([
    get(`${BASE}/teams?league=${WC_LEAGUE}&season=${WC_SEASON}`, { headers }),
    _getFifaRankMap(),
  ])

  return (teamsData.response || []).map(r => {
    const name          = r.team.name
    const confederation = CONFEDERATION_MAP[name] || 'Other'
    const meta          = TEAM_METADATA[name] || { rank: null, titles: 0 }

    // FIFA rank: prefer live API ranking, fall back to TEAM_METADATA snapshot
    const rank = rankMap?.[name] ?? meta.rank

    // Static map is ground-truth for all 48 WC teams — always prefer it.
    // The API sometimes returns wrong venues (e.g. Oakland Coliseum for Mexico).
    const staticVenue = NATIONAL_STADIUMS[name]
    const venue = staticVenue
      ? {
          name:     staticVenue.name,
          city:     staticVenue.city,
          capacity: staticVenue.capacity,
          image:    r.venue?.image || '',
        }
      : {
          name:     r.venue?.name     || '',
          city:     r.venue?.city     || '',
          capacity: r.venue?.capacity || null,
          image:    r.venue?.image    || '',
        }

    return {
      id:            r.team.id,
      name,
      code:          r.team.code  || '',
      flag:          r.team.logo,
      country:       r.team.country,
      founded:       r.team.founded || null,
      confederation,
      region:        confederation,
      rank,
      titles:        meta.titles,
      coach:         null,
      gf: 0, ga: 0, pts: 0,
      mp: 0, w: 0, d: 0, l: 0,
      form:          [],
      squad:         [],
      venue,
    }
  })
}

// ─────────────────────────────────────────────────────
// PARTIDOS DE UN EQUIPO
// ─────────────────────────────────────────────────────

/**
 * Todos los partidos del Mundial para un equipo específico.
 * @param {number} teamId
 */
/**
 * Head coach info for a national team.
 * Returns coach object with name, photo, nationality, age and career array.
 * @param {number} teamId
 */
export async function getCoach(teamId) {
  if (isMock || !teamId) return null

  const data = await get(`${BASE}/coachs?team=${teamId}`, { headers })
  const c = data.response?.[0]
  if (!c) return null

  return {
    id:          c.id,
    name:        c.name,
    firstName:   c.firstname,
    lastName:    c.lastname,
    photo:       c.photo,
    nationality: c.nationality,
    age:         c.age,
    birth:       c.birth,
    career: (c.career || []).map(e => ({
      team:  e.team?.name,
      logo:  e.team?.logo,
      start: e.start,
      end:   e.end,
    })),
  }
}

export async function getTeamFixtures(teamId) {
  if (isMock) {
    // In mock, match by team name — look up from TEAMS
    const team = TEAMS.find(t => t.id === Number(teamId))
    const name = team?.name
    if (!name) return []
    return MATCHES.filter(m => m.team1 === name || m.team2 === name)
  }

  const data = await get(
    `${BASE}/fixtures?league=${WC_LEAGUE}&season=${WC_SEASON}&team=${teamId}`,
    { headers }
  )
  return (data.response || []).map(normalizeFixture)
}

// ─────────────────────────────────────────────────────
// JUGADORES  ← con filtro por país
// ─────────────────────────────────────────────────────

/**
 * Top scorers/assists/cards del Mundial.
 * Usa los endpoints oficiales de API-Football, ordenados de mayor a menor.
 * Apenas haya 1+ jugador real con esa estadística, se muestra de
 * inmediato — sin rellenar con jugadores hardcodeados de equipos
 * prioritarios. Si la API aún no tiene datos, devuelve [] y la UI
 * muestra "Sin datos disponibles aún".
 */
function _sortByStat(players, statKey) {
  return [...players].sort((a, b) => (b[statKey] || 0) - (a[statKey] || 0))
}

export async function getTopScorers() {
  if (isMock) return [...PLAYERS].sort((a, b) => b.goals - a.goals || b.intlGoals - a.intlGoals)

  const topData = await get(
    `${BASE}/players/topscorers?league=${WC_LEAGUE}&season=${WC_SEASON}`,
    { headers }
  )

  const topScorers = (topData.response || []).map(normalizePlayer)
  return _sortByStat(topScorers, 'goals')
}

/** Top asistidores del Mundial */
export async function getTopAssists() {
  if (isMock) return [...PLAYERS].sort((a, b) => (b.assists || 0) - (a.assists || 0))

  const data = await get(
    `${BASE}/players/topassists?league=${WC_LEAGUE}&season=${WC_SEASON}`,
    { headers }
  )
  const players = (data.response || []).map(normalizePlayer)
  return _sortByStat(players, 'assists')
}

/** Top tarjetas amarillas del Mundial */
export async function getTopYellowCards() {
  if (isMock) return [...PLAYERS].sort((a, b) => (b.yellowCards || 0) - (a.yellowCards || 0))

  const data = await get(
    `${BASE}/players/topyellowcards?league=${WC_LEAGUE}&season=${WC_SEASON}`,
    { headers }
  )
  const players = (data.response || []).map(normalizePlayer)
  return _sortByStat(players, 'yellowCards')
}

/** Top tarjetas rojas del Mundial */
export async function getTopRedCards() {
  if (isMock) return [...PLAYERS].sort((a, b) => (b.redCards || 0) - (a.redCards || 0))

  const data = await get(
    `${BASE}/players/topredcards?league=${WC_LEAGUE}&season=${WC_SEASON}`,
    { headers }
  )
  const players = (data.response || []).map(normalizePlayer)
  return _sortByStat(players, 'redCards')
}

/**
 * Jugadores de un equipo específico (para filtrar por país).
 * En mock: filtra PLAYERS por nation.
 * @param {number|string} teamId — ID del equipo en API-Football, o nombre para mock
 */
export async function getPlayersByTeam(teamId) {
  if (isMock) {
    // En mock, teamId es el nombre del país
    if (!teamId || teamId === 'all') return PLAYERS
    return PLAYERS.filter(p =>
      p.nation.toLowerCase() === String(teamId).toLowerCase()
    )
  }

  const data = await get(
    `${BASE}/players?team=${teamId}&season=${WC_SEASON}`,
    { headers }
  )
  return (data.response || []).map(normalizePlayer)
}

// ─────────────────────────────────────────────────────
// JUGADORES — Roster completo por equipo
// Carga TODAS las páginas de un equipo de una vez para que
// los filtros (posición, búsqueda) funcionen sobre el plantel
// completo y no solo sobre los 20 de la página activa.
// Docs: /players?team=ID&season=2026&page=N
// ─────────────────────────────────────────────────────

/** Ordena por apellido (última palabra del nombre) */
const byLastName = (a, b) =>
  a.name.split(' ').pop().localeCompare(b.name.split(' ').pop())

/**
 * Todos los jugadores de un equipo, todas las páginas, ordenados por apellido.
 * @param {number|null} teamId – ID del equipo; null = todos (solo mock)
 * @returns {Array} array plano de jugadores normalizados
 */
export async function getAllTeamPlayers(teamId) {
  if (isMock) {
    let all = [...PLAYERS]
    if (teamId !== null && teamId !== undefined) {
      const team   = TEAMS.find(t => t.id === Number(teamId))
      const nation = team?.name ?? String(teamId)
      all = all.filter(p => p.nation?.toLowerCase() === nation.toLowerCase())
    }
    return all.sort(byLastName)
  }

  if (teamId === null || teamId === undefined) return []

  // ── Step 1: Official squad registration (all 26 players, no stats) ──────
  // /players/squads returns every registered player regardless of whether
  // they have played a single minute — this is the source of truth for
  // squad completeness during the tournament.
  let squadPlayers = []
  try {
    const squadData = await get(`${BASE}/players/squads?team=${teamId}`, { headers })
    squadPlayers = squadData.response?.[0]?.players || []
  } catch { /* fall through to stats-only path */ }

  // ── Step 2: Collect stats for players who have appeared in matches ───────
  // Try WC 2026 first, fall back to recent seasons for pre-tournament data.
  const statsMap   = new Map()   // player id → raw API response item
  const seasonsToTry = [WC_SEASON, WC_SEASON - 1, WC_SEASON - 2]

  for (const season of seasonsToTry) {
    try {
      const first = await get(
        `${BASE}/players?team=${teamId}&season=${season}&page=1`,
        { headers },
      )
      const total = first.paging?.total ?? 1
      const restPages = total > 1
        ? await Promise.all(
            Array.from({ length: total - 1 }, (_, i) =>
              get(`${BASE}/players?team=${teamId}&season=${season}&page=${i + 2}`, { headers })
            )
          )
        : []

      ;[first, ...restPages]
        .flatMap(p => p.response || [])
        .forEach(r => { if (r.player?.id) statsMap.set(r.player.id, r) })

      if (statsMap.size > 0) break   // got stats — no need to try older seasons
    } catch { /* try next season */ }
  }

  // ── Step 3: Merge — squad list is the base, stats enrich where available ─
  // Derive nationality from any stats entry (all players share the same nation)
  const sampleNation = statsMap.size > 0
    ? [...statsMap.values()][0].player.nationality || ''
    : ''

  let players
  if (squadPlayers.length > 0) {
    players = squadPlayers.map(sp => {
      const statsRaw = statsMap.get(sp.id)
      // Player has appeared in a match → use full stats normalizer
      if (statsRaw) return normalizePlayer(statsRaw, teamId)
      // Player is registered but hasn't played → use basic squad data
      return normalizeSquadPlayer(sp, teamId, sampleNation)
    })
  } else {
    // Squads endpoint failed — fall back to stats-only (old behaviour)
    players = [...statsMap.values()].map(r => normalizePlayer(r, teamId))
  }

  players = players.sort(byLastName)

  if (players.length > 0) {
    squadCache.set(Number(teamId), players)
    persistToStorage()
    return players
  }

  return []
}

/**
 * Silently pre-loads squads for the top N teams by FIFA rank so that
 * global player search works without the user having to pick a country.
 * Runs only once per session and only in API mode.
 * @param {Array} teams  — full teams array from getTeams()
 * @param {number} limit — how many top teams to preload (default 12)
 */
export async function preloadTopSquads(teams, limit = 12) {
  if (isMock || preloadStarted || !teams?.length) return
  preloadStarted = true

  const sorted = [...teams]
    .filter(t => t.id)
    .sort((a, b) => (a.rank || 999) - (b.rank || 999))
    .slice(0, limit)

  // Load in two batches of 6 to avoid hitting rate limits
  const batch1 = sorted.slice(0, 6)
  const batch2 = sorted.slice(6)

  await Promise.allSettled(batch1.map(t => getAllTeamPlayers(t.id)))
  await Promise.allSettled(batch2.map(t => getAllTeamPlayers(t.id)))
}

/**
 * Global player search by name — used when no team is selected.
 * Searches within the WC 2026 context first, then recent seasons as fallback.
 * @param {string} query – at least 3 characters
 */
export async function searchPlayers(query) {
  if (isMock) {
    if (!query || query.length < 2) return []
    const q = query.toLowerCase()
    return PLAYERS.filter(p => p.name?.toLowerCase().includes(q))
  }

  const q = (query || '').trim()
  if (q.length < 3) return []

  const qLower = q.toLowerCase()

  // ── Pass 1: search across any team squads already cached this session ──
  // This gives instant results after the user has visited any team page.
  if (squadCache.size > 0) {
    const hits = []
    const seen = new Set()
    for (const players of squadCache.values()) {
      for (const p of players) {
        if (!seen.has(p.id) && p.name?.toLowerCase().includes(qLower)) {
          seen.add(p.id)
          hits.push(p)
        }
      }
    }
    if (hits.length > 0) return hits.slice(0, 20)
  }

  // ── Pass 2: API search — try WC 2026 then recent seasons as fallback ──
  const attempts = [
    `${BASE}/players?search=${encodeURIComponent(q)}&league=${WC_LEAGUE}&season=${WC_SEASON}`,
    `${BASE}/players?search=${encodeURIComponent(q)}&season=${WC_SEASON - 1}`,
    `${BASE}/players?search=${encodeURIComponent(q)}&season=${WC_SEASON - 2}`,
  ]

  for (const url of attempts) {
    try {
      const data = await get(url, { headers })
      const players = (data.response || []).map(r => normalizePlayer(r, null)).sort(byLastName)
      if (players.length > 0) return players
    } catch { /* try next */ }
  }

  return []
}

// ─────────────────────────────────────────────────────
// DETALLE DE JUGADOR — club actual
// La API de WC solo devuelve estadísticas del torneo, donde el
// "team" del jugador es su selección nacional, no su club.
// Esta función llama al endpoint de temporada de club para obtener
// el club actual del jugador.
// ─────────────────────────────────────────────────────

/**
 * Fetches a player's current club from their most recent club season.
 * Returns { club, clubLogo } or null.
 * @param {number} playerId – API-Football player ID
 */
export async function getPlayerDetails(playerId) {
  if (isMock) return null

  const currentYear = new Date().getFullYear()
  // Try the current season year and the previous one as fallback
  const seasons = [currentYear - 1, currentYear - 2]

  for (const season of seasons) {
    try {
      const data = await get(
        `${BASE}/players?id=${playerId}&season=${season}`,
        { headers }
      )
      const raw = data.response?.[0]
      if (!raw) continue

      const p = raw.player
      const stats = raw.statistics || []

      // Pick the entry with the most appearances that is NOT the national team.
      // National team entries have st.team.name === p.nationality.
      const clubStat = stats
        .filter(s => s.team?.name && s.team.name !== p.nationality)
        .sort((a, b) => (b.games?.appearences || 0) - (a.games?.appearences || 0))[0]

      if (clubStat?.team?.name) {
        return {
          club:     clubStat.team.name,
          clubLogo: clubStat.team.logo || '',
        }
      }
    } catch { /* try next season */ }
  }
  return null
}

// ─────────────────────────────────────────────────────
// FORM — últimos N partidos de un equipo
// Uses /fixtures?team=ID&last=N (any competition)
// Returns array of 'W' | 'D' | 'L' strings, oldest → newest
// ─────────────────────────────────────────────────────

export async function getTeamForm(teamId, last = 5) {
  if (isMock) return []
  try {
    const data = await get(
      `${BASE}/fixtures?team=${teamId}&last=${last}`,
      { headers }
    )
    return (data.response || []).map(f => {
      const h        = f.teams?.home
      const a        = f.teams?.away
      const g        = f.goals
      const isHome   = h?.id === Number(teamId)
      const myGoals  = isHome ? g?.home : g?.away
      const oppGoals = isHome ? g?.away : g?.home
      const finished = ['FT', 'AET', 'PEN'].includes(f.fixture?.status?.short)
      if (!finished || myGoals == null || oppGoals == null) return null
      if (myGoals > oppGoals) return 'W'
      if (myGoals === oppGoals) return 'D'
      return 'L'
    }).filter(Boolean)
  } catch {
    return []
  }
}

// ─────────────────────────────────────────────────────
// PREDICCIONES
// ─────────────────────────────────────────────────────

export async function getMatchPrediction(fixtureId) {
  if (isMock) return { home: 52, draw: 22, away: 26, winner: null, advice: null, winnerComment: null }

  const data = await get(`${BASE}/predictions?fixture=${fixtureId}`, { headers })
  const p = data.response?.[0]
  if (!p) return null
  const pred = p.predictions
  return {
    home:          parseInt(pred?.percent?.home || '50'),
    draw:          parseInt(pred?.percent?.draw || '20'),
    away:          parseInt(pred?.percent?.away || '30'),
    winner:        pred?.winner?.name    || null,
    winnerComment: pred?.winner?.comment || null,
    advice:        pred?.advice          || null,
  }
}

/**
 * Head-to-head history between two teams.
 * @param {number} team1Id
 * @param {number} team2Id
 * @param {number} last — number of matches to return (default 5)
 */
export async function getHeadToHead(team1Id, team2Id, last = 5) {
  if (isMock || !team1Id || !team2Id) return []

  const data = await get(
    `${BASE}/fixtures/headtohead?h2h=${team1Id}-${team2Id}&last=${last}`,
    { headers }
  )
  return (data.response || []).map(f => {
    const h = f.teams?.home
    const a = f.teams?.away
    const g = f.goals
    return {
      id:     f.fixture?.id,
      date:   f.fixture?.date,
      home:   h?.name,
      away:   a?.name,
      score:  g?.home != null && g?.away != null ? `${g.home}–${g.away}` : null,
      status: f.fixture?.status?.short,
      winner: h?.winner ? h.name : a?.winner ? a.name : 'Draw',
    }
  }).reverse() // oldest first
}

/**
 * Pre-match odds — bookmaker 8 (Bet365), last 7 days only.
 */
export async function getMatchOdds(fixtureId) {
  if (isMock) return null
  const data = await get(`${BASE}/odds?fixture=${fixtureId}&bookmaker=8`, { headers })
  const bk = data.response?.[0]?.bookmakers?.[0]
  if (!bk) return null
  const market = bk.bets?.find(b => b.name === 'Match Winner')
  if (!market) return null
  const find = val => market.values?.find(v => v.value === val)?.odd ?? null
  return {
    bookmaker: bk.bookmaker?.name ?? 'Bet365',
    home: find('Home'),
    draw: find('Draw'),
    away: find('Away'),
  }
}

// ─────────────────────────────────────────────────────
// WC 2026 — stadium → city fallback
// Used when the API returns a venue name but an empty city field.
// ─────────────────────────────────────────────────────

const WC2026_CITY = {
  'MetLife Stadium':               'East Rutherford, NJ',
  'AT&T Stadium':                  'Arlington, TX',
  'SoFi Stadium':                  'Inglewood, CA',
  "Levi's Stadium":                'Santa Clara, CA',
  'Lumen Field':                   'Seattle, WA',
  'Gillette Stadium':              'Foxborough, MA',
  'Lincoln Financial Field':       'Philadelphia, PA',
  'Arrowhead Stadium':             'Kansas City, MO',
  'NRG Stadium':                   'Houston, TX',
  'Empower Field at Mile High':    'Denver, CO',
  'BC Place':                      'Vancouver, BC',
  'BMO Field':                     'Toronto, ON',
  'Estadio Azteca':                'Mexico City',
  'Estadio BBVA':                  'Monterrey',
  'Estadio Akron':                 'Guadalajara',
}

// ─────────────────────────────────────────────────────
// NORMALIZADORES
// ─────────────────────────────────────────────────────

function normalizeFixture(raw) {
  const f = raw.fixture
  const h = raw.teams?.home
  const a = raw.teams?.away
  const g = raw.goals

  const stadiumName = f.venue?.name || ''
  const apiCity     = f.venue?.city || ''
  const city        = apiCity || WC2026_CITY[stadiumName] || ''

  // Elapsed time — include extra time ("45+2'") when present
  const elapsed = f.status?.elapsed
  const extra   = f.status?.extra
  const timeStr = elapsed != null
    ? `${elapsed}${extra ? '+' + extra : ''}'`
    : formatKickoff(f.date)

  return {
    id:      f.id,
    team1:   h?.name,
    flag1:   h?.logo,      // URL — en componentes, usa <img src={flag1} />
    team1Id: h?.id ?? null, // API-Football team ID for navigation
    team2:   a?.name,
    flag2:   a?.logo,
    team2Id: a?.id ?? null,
    score1:  g?.home ?? null,
    score2:  g?.away ?? null,
    status:  mapStatus(f.status?.short),
    time:    timeStr,
    group:   raw.league?.round || '',
    venue:   stadiumName,   // stadium building name
    stadium: city,          // city / location  (field kept as 'stadium' for compat)
    date:    f.date,
    referee: f.referee || null,
  }
}

function formatKickoff(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('es-US', { hour: '2-digit', minute: '2-digit' })
}

function normalizeStats(response) {
  // The API returns possession as a string like "50%" — parse to number.
  // All other values are numbers or null.
  const findNum = (arr, label) => {
    const val = arr?.statistics?.find(s => s.type === label)?.value
    if (val === null || val === undefined) return 0
    if (typeof val === 'string') return parseFloat(val) || 0
    return Number(val) || 0
  }

  const h = response[0]
  const a = response[1]

  return {
    possession:    { home: findNum(h, 'Ball Possession'), away: findNum(a, 'Ball Possession') },
    shots:         { home: findNum(h, 'Total Shots'),     away: findNum(a, 'Total Shots') },
    shotsOnTarget: { home: findNum(h, 'Shots on Goal'),   away: findNum(a, 'Shots on Goal') },
    corners:       { home: findNum(h, 'Corner Kicks'),    away: findNum(a, 'Corner Kicks') },
    fouls:         { home: findNum(h, 'Fouls'),           away: findNum(a, 'Fouls') },
    yellowCards:   { home: findNum(h, 'Yellow Cards'),    away: findNum(a, 'Yellow Cards') },
    xg:            { home: findNum(h, 'expected_goals'),  away: findNum(a, 'expected_goals') },
  }
}

function normalizeStandings(response) {
  if (!response.length) return {}
  const standings = response[0]?.league?.standings || []
  const groups = {}
  standings.forEach(group => {
    const rawGroup = group[0]?.group || ''
    const letter = rawGroup.split(' - ').pop()?.replace('Group ', '').trim() || '?'
    const teams = group.map(t => ({
      flag: t.team.logo,
      name: t.team.name,
      mp:   t.all.played,
      w:    t.all.win,
      d:    t.all.draw,
      l:    t.all.lose,
      gf:   t.all.goals.for,
      ga:   t.all.goals.against,
      pts:  t.points,
    }))
    // Deduplicate by team name — API sometimes returns duplicate entries
    const seen = new Set()
    groups[letter] = teams.filter(t => {
      if (seen.has(t.name)) return false
      seen.add(t.name)
      return true
    })
  })
  return groups
}

/** Maps API position strings → 2-letter code used by the position filter */
function apiPos(position) {
  switch ((position || '').toLowerCase()) {
    case 'goalkeeper': return 'GK'
    case 'defender':   return 'DF'
    case 'midfielder': return 'MF'
    default:           return 'FW'  // Attacker / Forward / Striker
  }
}

/**
 * Normalizes a player from the /players/squads endpoint.
 * Returns basic shape (no stats) — merged later with stats data if available.
 * Squads endpoint positions: "G" | "D" | "M" | "A"
 */
function normalizeSquadPlayer(p, teamId, nation = '') {
  const posMap = { G: 'GK', D: 'DF', M: 'MF', A: 'FW' }
  return {
    id:        p.id,
    name:      p.name,
    photo:     p.photo || '',
    emoji:     '⭐',
    flag:      '',
    pos:       posMap[p.pos] || 'FW',
    club:      '',
    age:       p.age,
    nation,
    goals:     0,
    assists:   0,
    rating:    '0.0',
    val:       '—',
    height:    null,
    weight:    null,
    caps:      0,
    intlGoals: 0,
    teamId:    teamId || null,
  }
}

/**
 * @param {object} raw  – raw API response item { player, statistics }
 * @param {number|null} teamId – WC-2026 national team ID (set by getAllTeamPlayers)
 */
function normalizePlayer(raw, teamId = null) {
  const p    = raw.player
  // raw.statistics can contain multiple entries (one per competition the
  // player appeared in this season — World Cup, qualifiers, friendlies,
  // club league, etc). Only use the World Cup 2026 (league=1) entry so we
  // never show goals/assists/cards from old competitions.
  const stats = raw.statistics || []
  const st = stats.find(s => s.league?.id === WC_LEAGUE && s.league?.season === WC_SEASON)
    || stats.find(s => s.league?.id === WC_LEAGUE)
    || {}

  // Club name: prefer a non-World-Cup statistics entry (the player's
  // domestic club), since st.team in the WC entry is the national team.
  const clubStats = stats.find(s => s.league?.id !== WC_LEAGUE && s.team?.name)
  const teamName    = clubStats?.team?.name || st.team?.name || ''
  const nationality = p.nationality || ''
  const club        = teamName && teamName !== nationality ? teamName : ''

  return {
    id:        p.id,
    name:      p.name,
    photo:     p.photo,     // URL from API
    emoji:     '⭐',
    flag:      '',
    pos:       apiPos(st.games?.position),
    club,                   // '' when from national-team endpoint (filled later by getPlayerDetails)
    age:       p.age,
    nation:    nationality,
    goals:       st.goals?.total    || 0,
    assists:     st.goals?.assists  || 0,
    rating:      parseFloat(st.games?.rating || '0').toFixed(1),
    val:         '—',         // not available from API-Football
    height:      p.height,
    weight:      p.weight,
    caps:        st.games?.appearences || 0,
    intlGoals:   st.goals?.total || 0,
    yellowCards: st.cards?.yellow || 0,
    redCards:    st.cards?.red    || 0,
    teamId:      teamId || null, // WC-2026 national team API ID — used for team-detail navigation
  }
}

// ─────────────────────────────────────────────────────
// MOCK DATA EXTRAS
// ─────────────────────────────────────────────────────

const MOCK_STATS = {
  possession:    { home: 55, away: 45 },
  shots:         { home: 14, away: 8  },
  shotsOnTarget: { home: 6,  away: 3  },
  corners:       { home: 7,  away: 3  },
  fouls:         { home: 10, away: 13 },
  yellowCards:   { home: 1,  away: 2  },
  xg:            { home: 1.8,away: 0.9 },
}

const MOCK_EVENTS = [
  { time: "12'",  type: 'Goal',  detail: 'Normal Goal',  team: 'Team 1', player: 'Jugador' },
  { time: "26'",  type: 'Card',  detail: 'Yellow Card',  team: 'Team 2', player: 'Jugador' },
  { time: "45+2'",type: 'HT',   detail: 'Half Time',    team: null,     player: null       },
  { time: "63'",  type: 'Goal',  detail: 'Header',       team: 'Team 1', player: 'Jugador' },
  { time: "71'",  type: 'subst', detail: 'Substitution', team: 'Team 2', player: 'Jugador' },
  { time: "78'",  type: 'Goal',  detail: 'Penalty',      team: 'Team 2', player: 'Jugador' },
]
export async function getInjuries() {
  if (isMock) return []
  const data = await get(
    `${BASE}/injuries?league=${WC_LEAGUE}&season=${WC_SEASON}`,
    { headers }
  )
  const list = (data.response || [])
    .map(raw => ({
      id:     raw.player?.id,
      name:   raw.player?.name || '',
      photo:  raw.player?.photo || null,
      nation: raw.team?.name || '',
      type:   raw.player?.type || '',
      reason: raw.player?.reason || '',
      date:   raw.fixture?.date || null,
    }))
    .filter(p => p.id && p.name)
  const byId = new Map()
  for (const inj of list) {
    const existing = byId.get(inj.id)
    if (!existing || (inj.date && (!existing.date || inj.date > existing.date))) {
      byId.set(inj.id, inj)
    }
  }
  return [...byId.values()].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
}