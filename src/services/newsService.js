// ─── News Service — TheNewsAPI ─────────────────────────
// https://www.thenewsapi.com/documentation

import { get } from './http.js'
import { NEWS } from '../data/mockData.js'

const BASE   = '/api/news'   // proxied: Vite en dev, Vercel function en prod
const KEY    = import.meta.env.VITE_NEWS_API_KEY || ''
const isMock = !KEY || KEY === 'TU_CLAVE_AQUI'

// ─── Query strings (EN) ─────────────────────────────
const QUERIES_EN = {
  all:          'World Cup 2026',
  breaking:     'World Cup 2026 breaking news',
  match_report: 'World Cup 2026 match goal score result',
  injury:       'World Cup 2026 injury player doubt squad',
  transfer:     'World Cup 2026 transfer signing squad',
  trending:     'World Cup 2026 reaction viral record',
}

// ─── Query strings (ES) ─────────────────────────────
const QUERIES_ES = {
  all:          'Copa del Mundo 2026',
  breaking:     'Copa del Mundo 2026 urgente noticias',
  match_report: 'Copa del Mundo 2026 partido gol resultado',
  injury:       'Copa del Mundo 2026 lesion jugador baja',
  transfer:     'Copa del Mundo 2026 fichaje convocatoria',
  trending:     'Copa del Mundo 2026 viral reaccion record',
}

// ─── World Cup 2026 relevance filter ────────────────
// Primary: must contain "2026" and a World Cup term
const WC_EN = /(?=.*2026)(?=.*(?:world cup|fifa|wc26|mundial))/i
const WC_ES = /(?=.*2026)(?=.*(?:mundial|copa del mundo|fifa|wc26))/i

// Broad soccer filter as secondary fallback
const SOCCER_EN = /world cup|soccer|football|fifa|goal|messi|ronaldo|mbappé|neymar|premier league|la liga|bundesliga|serie a/i
const SOCCER_ES = /mundial|copa del mundo|fútbol|futbol|gol|messi|ronaldo|mbappé|neymar|selección|seleccion|la liga|bundesliga/i

// ─── Mock fallback by category ───────────────────────
function mockByCategory(category) {
  const catMap = {
    all:          NEWS,
    breaking:     NEWS.filter(n => n.cat === 'BREAKING'),
    match_report: NEWS.filter(n => n.cat === 'MATCH REPORT'),
    injury:       NEWS.filter(n => n.cat === 'INJURY'),
    transfer:     NEWS.filter(n => n.cat === 'TRANSFER'),
    trending:     NEWS.filter(n => n.cat === 'TRENDING'),
    world_cup:    NEWS.filter(n => n.cat === 'WORLD CUP'),
  }
  return catMap[category]?.length ? catMap[category] : NEWS
}

// ─── Multi-page fetch helper ──────────────────────────
// TheNewsAPI free tier caps at 3 articles per page regardless of the limit
// param. Fetching multiple pages in parallel multiplies the result pool.
async function fetchNewsPool(baseParams, numPages = 3) {
  const requests = Array.from({ length: numPages }, (_, i) => {
    const p = new URLSearchParams(baseParams)
    p.set('page', String(i + 1))
    return get(`${BASE}?${p}`).catch(() => null)
  })

  const responses = await Promise.all(requests)
  const seen      = new Set()
  const pool      = []

  for (const data of responses) {
    if (!data?.data) continue
    for (const a of data.data) {
      const key = a.uuid || a.url
      if (key && !seen.has(key) && a.title && a.title !== '[Removed]') {
        seen.add(key)
        pool.push(a)
      }
    }
  }

  return pool
}

// ─── GET /news/all ───────────────────────────────────
export async function getNews(category = 'all', lang = 'en', pageSize = 18) {
  if (isMock) return mockByCategory(category)

  const isEs     = lang === 'es'
  const queries  = isEs ? QUERIES_ES : QUERIES_EN
  const q        = queries[category] || queries.all
  const wcFilter = isEs ? WC_ES    : WC_EN
  const fallback = isEs ? SOCCER_ES : SOCCER_EN

  // Fetch 3 pages in parallel — gives up to 9 articles on free tier,
  // more on paid plans where limit > 3.
  const baseParams = {
    api_token:  KEY,
    search:     q,
    categories: 'sports',
    language:   isEs ? 'es' : 'en',
    limit:      String(Math.min(pageSize, 10)),
    sort:       'published_at',
  }

  try {
    const pool = await fetchNewsPool(baseParams, 3)

    if (pool.length === 0) {
      console.warn('[newsService] TheNewsAPI returned no articles — using mock data')
      return mockByCategory(category)
    }

    // When the pool is still smaller than requested (heavy free-tier cap),
    // trust the search query and skip the secondary title filter.
    let articles
    if (pool.length < pageSize) {
      articles = pool.map(a => normalizeArticle(a, lang))
    } else {
      articles = pool
        .filter(a => wcFilter.test(a.title) || wcFilter.test(a.description || ''))
        .map(a => normalizeArticle(a, lang))

      if (articles.length < pageSize) {
        const seen = new Set(articles.map(a => a.id))
        const extra = pool
          .filter(a => !seen.has(a.uuid || a.url))
          .filter(a => fallback.test(a.title) || fallback.test(a.description || ''))
          .map(a => normalizeArticle(a, lang))
        articles = [...articles, ...extra]
      }

      if (articles.length === 0) articles = pool.map(a => normalizeArticle(a, lang))
    }

    if (articles.length === 0) return mockByCategory(category)
    return articles.slice(0, pageSize)
  } catch (err) {
    console.warn('[newsService] Request failed, using mock data:', err.message)
    return mockByCategory(category)
  }
}

export async function getHeadlines(lang = 'en', pageSize = 6) {
  if (isMock) return NEWS.slice(0, pageSize)

  const isEs     = lang === 'es'
  const q        = isEs ? 'Copa del Mundo 2026' : 'World Cup 2026'
  const wcFilter = isEs ? WC_ES : WC_EN
  const fallback = isEs ? SOCCER_ES : SOCCER_EN

  // 2 pages in parallel for the home headline strip
  const baseParams = {
    api_token:  KEY,
    search:     q,
    categories: 'sports',
    language:   isEs ? 'es' : 'en',
    limit:      String(Math.max(pageSize, 5)),
    sort:       'published_at',
  }

  try {
    const pool = await fetchNewsPool(baseParams, 2)

    if (pool.length === 0) return NEWS.slice(0, pageSize)

    let articles
    if (pool.length < pageSize) {
      articles = pool.map(a => normalizeArticle(a, lang))
    } else {
      articles = pool
        .filter(a => wcFilter.test(a.title) || wcFilter.test(a.description || ''))
        .map(a => normalizeArticle(a, lang))

      if (articles.length < 3) {
        articles = pool
          .filter(a => fallback.test(a.title) || fallback.test(a.description || ''))
          .map(a => normalizeArticle(a, lang))
      }

      if (articles.length === 0) articles = pool.map(a => normalizeArticle(a, lang))
    }

    return articles.slice(0, pageSize)
  } catch {
    return NEWS.slice(0, pageSize)
  }
}

// ─── Normalizador — adapta campos de TheNewsAPI ──────
function normalizeArticle(a, lang = 'en') {
  const title = a.title?.toLowerCase() || ''
  const isEs  = lang === 'es'

  // Detección de categoría por keywords
  let cat = 'WORLD CUP'
  if (isEs) {
    if (title.includes('lesión') || title.includes('lesion') || title.includes('baja') || title.includes('duda'))
      cat = 'INJURY'
    else if (title.includes('fichaje') || title.includes('transferencia') || title.includes('contrato') || title.includes('firma'))
      cat = 'TRANSFER'
    else if (title.includes('gol') || title.includes('derrota') || title.includes('victoria') || title.includes('empate') || title.includes('resultado'))
      cat = 'MATCH REPORT'
    else if (title.includes('urgente') || title.includes('confirma') || title.includes('anuncia') || title.includes('oficial'))
      cat = 'BREAKING'
    else if (title.includes('tendencia') || title.includes('viral') || title.includes('reacción') || title.includes('reaccion'))
      cat = 'TRENDING'
  } else {
    if (title.includes('injur') || title.includes('doubt') || title.includes('miss'))
      cat = 'INJURY'
    else if (title.includes('transfer') || title.includes('sign') || title.includes('deal'))
      cat = 'TRANSFER'
    else if (title.includes('goal') || title.includes('beat') || title.includes('win') || title.includes('score'))
      cat = 'MATCH REPORT'
    else if (title.includes('break') || title.includes('confirm') || title.includes('announce'))
      cat = 'BREAKING'
    else if (title.includes('trend') || title.includes('viral') || title.includes('reaction'))
      cat = 'TRENDING'
  }

  const emojiMap = {
    'INJURY': '🚑', 'TRANSFER': '💰', 'MATCH REPORT': '⚽',
    'BREAKING': '⚡', 'WORLD CUP': '🏆', 'TRENDING': '🔥',
  }
  const colorMap = {
    'BREAKING': '#f0b429', 'MATCH REPORT': '#3b82f6', 'INJURY': '#ef4444',
    'WORLD CUP': '#10b981', 'TRANSFER': '#f97316', 'TRENDING': '#06b6d4',
  }
  const catLabelEN = { 'INJURY': 'INJURY', 'TRANSFER': 'TRANSFER', 'MATCH REPORT': 'MATCH REPORT', 'BREAKING': 'BREAKING', 'WORLD CUP': 'WORLD CUP', 'TRENDING': 'TRENDING' }
  const catLabelES = { 'INJURY': 'LESIÓN', 'TRANSFER': 'FICHAJE', 'MATCH REPORT': 'CRÓNICA', 'BREAKING': 'URGENTE', 'WORLD CUP': 'MUNDIAL', 'TRENDING': 'TENDENCIA' }

  return {
    id:      a.uuid || a.url,
    cat,
    catLabel: isEs ? (catLabelES[cat] || cat) : (catLabelEN[cat] || cat),
    emoji:   emojiMap[cat]  || '📰',
    color:   colorMap[cat]  || '#64748b',
    title:   a.title,
    excerpt: a.description || a.snippet || '',
    url:     a.url,
    image:   a.image_url   || null,    // TheNewsAPI usa image_url
    source:  a.source      || '',      // ya es string en TheNewsAPI
    time:    relativeTime(a.published_at, lang),  // TheNewsAPI usa published_at
  }
}

function relativeTime(iso, lang = 'en') {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (lang === 'es') {
    if (mins < 60)  return `hace ${mins} min`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24)   return `hace ${hrs}h`
    return `hace ${Math.floor(hrs / 24)}d`
  }
  if (mins < 60)  return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
