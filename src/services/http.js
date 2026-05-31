// ─── Cliente HTTP base ───────────────────────────────
// Todas las llamadas pasan por aquí: timeout, headers, errores.

const TIMEOUT_MS = 9000

export async function request(url, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}: ${res.statusText}`)
      err.status = res.status
      throw err
    }
    return await res.json()
  } catch (err) {
    clearTimeout(timer)
    if (err.name === 'AbortError') throw new Error('Timeout: la API tardó demasiado.')
    throw err
  }
}

export const get  = (url, opts = {}) => request(url, { 
  method: 'GET', 
  headers: opts.headers || {},
  ...opts,
})
export const post = (url, body, opts = {}) =>
  request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    body: JSON.stringify(body),
    ...opts,
  })
