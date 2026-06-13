// ─── YouTube Highlights Service ────────────────────────
// Fetches full-match "Extended Highlights" from FOX Soccer's
// official FIFA World Cup Game Highlights playlist.
//
// Playlist: PLSoN6Th-EepMUaxmTobuR_SBwVkdkxdfO
// The 2026 WC videos are appended at the END of this playlist
// (after 64 WC 2022 videos). We paginate all pages and filter
// to only videos published in 2026, then match by team name.
//
// FOX Soccer Extended Highlights title pattern:
//   "Mexico vs South Africa Extended Highlights 🌎🏆 2026 FIFA World Cup™"
//   "United States vs Paraguay Extended Highlights 🌎🏆 2026 FIFA World Cup™"
//   "South Korea vs Czechia Highlights 🌎🏆 2026 FIFA World Cup™"

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || ''
const isMock  = !API_KEY

const PLAYLIST_ID = 'PLSoN6Th-EepMUaxmTobuR_SBwVkdkxdfO' // FOX Soccer WC Highlights
const YT_BASE     = 'https://www.googleapis.com/youtube/v3'

const CACHE_TTL = 30 * 60 * 1000 // 30 min
let _cache     = null
let _cacheTime = 0

const TEAM_ALIASES = {
  USA:                    ['USA', 'United States', 'USMNT'],
  'South Korea':          ['South Korea', 'Korea Republic', 'Korea'],
  'Czech Republic':       ['Czech Republic', 'Czechia'],
  'Bosnia & Herzegovina': ['Bosnia', 'Bosnia and Herzegovina'],
  'Ivory Coast':          ["Ivory Coast", "Côte d'Ivoire", "Cote d'Ivoire"],
  'Congo DR':             ['Congo DR', 'DR Congo', 'Congo'],
  'Cape Verde Islands':   ['Cape Verde', 'Cabo Verde'],
  'Curaçao':              ['Curaçao', 'Curacao'],
  'Türkiye':              ['Türkiye', 'Turkey'],
}

function namesFor(team) {
  return TEAM_ALIASES[team] || [team]
}

function titleContainsTeam(title, team) {
  const lower = title.toLowerCase()
  return namesFor(team).some(alias => lower.includes(alias.toLowerCase()))
}

function is2026Highlight(title, publishedAt) {
  // Must be published in 2026 AND contain "highlight" in title
  const year = publishedAt ? new Date(publishedAt).getFullYear() : 0
  return year >= 2026 && title.toLowerCase().includes('highlight')
}

export async function getWorldCupHighlights() {
  if (isMock) return []
  if (_cache && Date.now() - _cacheTime < CACHE_TTL) return _cache

  const items = []
  let pageToken = ''

  try {
    // Paginate through all pages — 2026 videos are at the end
    // Max 5 pages × 50 = 250 items (playlist has ~120 total)
    for (let i = 0; i < 5; i++) {
      const params = new URLSearchParams({
        part:       'snippet',
        playlistId: PLAYLIST_ID,
        maxResults: '50',
        key:        API_KEY,
        ...(pageToken ? { pageToken } : {}),
      })

      const res = await fetch(`${YT_BASE}/playlistItems?${params}`)
      if (!res.ok) break
      const data = await res.json()

      for (const it of (data.items || [])) {
        const sn = it.snippet
        if (!sn?.resourceId?.videoId) continue
        if (sn.title === 'Private video' || sn.title === 'Deleted video') continue
        if (!is2026Highlight(sn.title, sn.publishedAt)) continue

        items.push({
          videoId:     sn.resourceId.videoId,
          title:       sn.title,
          thumbnail:   sn.thumbnails?.medium?.url || sn.thumbnails?.default?.url || null,
          publishedAt: sn.publishedAt || null,
        })
      }

      pageToken = data.nextPageToken
      if (!pageToken) break
    }
  } catch (e) {
    console.error('[YouTube] Error fetching highlights:', e)
    return _cache || []
  }

  _cache     = items
  _cacheTime = Date.now()
  console.log(`[YouTube] ${items.length} WC 2026 highlights loaded:`, items.map(v => v.title))
  return items
}

export function findHighlightForMatch(highlights, team1, team2) {
  if (!highlights?.length || !team1 || !team2) return null
  return highlights.find(h =>
    titleContainsTeam(h.title, team1) && titleContainsTeam(h.title, team2)
  ) || null
}

export async function getMatchHighlight(team1, team2) {
  const highlights = await getWorldCupHighlights()
  return findHighlightForMatch(highlights, team1, team2)
}