// ─── Vercel Serverless Function — TheNewsAPI Proxy ───
// Keeps NEWS_API_KEY server-side and avoids Vercel /api/* rewrite conflicts.
// Set VITE_NEWS_API_KEY (or NEWS_API_KEY) in Vercel's Environment Variables.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.NEWS_API_KEY || process.env.VITE_NEWS_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'NEWS_API_KEY not configured on server' })
  }

  try {
    // Forward all query params from the original request, override api_token
    const params = new URLSearchParams(req.query)
    params.set('api_token', apiKey)

    const upstream = await fetch(
      `https://api.thenewsapi.com/v1/news/all?${params.toString()}`,
      { headers: { Accept: 'application/json' } }
    )

    const data = await upstream.json()
    return res.status(upstream.status).json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
