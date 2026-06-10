// ─── Quiniela Service ─────────────────────────────────────────────────
// All API calls for the quiniela feature.
// Uses raw fetch with JWT token (same pattern as favorites).

const BASE = '/api/quiniela'

function authHeaders(token) {
  return {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${token}`,
  }
}

// ── Profile ───────────────────────────────────────────────────────────

export async function getQuinielaProfile(token) {
  const res = await fetch(`${BASE}/profile`, { headers: authHeaders(token) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function saveQuinielaProfile(token, { alias, avatar_color }) {
  const res = await fetch(`${BASE}/profile`, {
    method:  'POST',
    headers: authHeaders(token),
    body:    JSON.stringify({ alias, avatar_color }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

// ── Predictions ───────────────────────────────────────────────────────

export async function getMyPredictions(token) {
  const res = await fetch(`${BASE}/predictions`, { headers: authHeaders(token) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function upsertPrediction(token, payload) {
  const res = await fetch(`${BASE}/predictions`, {
    method:  'POST',
    headers: authHeaders(token),
    body:    JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

export async function deletePrediction(token, fixtureId) {
  const res = await fetch(`${BASE}/predictions/${fixtureId}`, {
    method:  'DELETE',
    headers: authHeaders(token),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

// ── Leaderboard ───────────────────────────────────────────────────────

export async function getGlobalLeaderboard(token, page = 1, perPage = 50) {
  const res = await fetch(
    `${BASE}/leaderboard?page=${page}&per_page=${perPage}`,
    { headers: authHeaders(token) }
  )
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ── Private Leagues ───────────────────────────────────────────────────

export async function getMyLeagues(token) {
  const res = await fetch(`${BASE}/leagues`, { headers: authHeaders(token) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function createLeague(token, name) {
  const res = await fetch(`${BASE}/leagues`, {
    method:  'POST',
    headers: authHeaders(token),
    body:    JSON.stringify({ name }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

export async function joinLeague(token, invite_code) {
  const res = await fetch(`${BASE}/leagues/join`, {
    method:  'POST',
    headers: authHeaders(token),
    body:    JSON.stringify({ invite_code }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

export async function getLeagueLeaderboard(token, leagueId) {
  const res = await fetch(`${BASE}/leagues/${leagueId}`, {
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function leaveLeague(token, leagueId) {
  const res = await fetch(`${BASE}/leagues/${leagueId}/leave`, {
    method:  'POST',
    headers: authHeaders(token),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

export async function deleteLeague(token, leagueId) {
  const res = await fetch(`${BASE}/leagues/${leagueId}`, {
    method:  'DELETE',
    headers: authHeaders(token),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

export async function getChampions() {
  const res = await fetch('/api/quiniela/champions')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function getMemberPredictions(token, leagueId, userId) {
  const res = await fetch(`/api/quiniela/leagues/${leagueId}/member/${userId}/predictions`, {
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}