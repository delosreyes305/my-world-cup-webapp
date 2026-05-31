// ─── useApi — Hook universal para llamadas async ─────
//
// Uso básico:
//   const { data, loading, error, refetch } = useApi(getLiveMatches)
//
// Con argumentos:
//   const { data } = useApi(getMatchesByDate, '2026-06-15')
//
// Skip (no llama):
//   const { data } = useApi(fn, arg, { skip: true })
//
// Con caché 60s:
//   const { data } = useApi(fn, arg, { ttl: 60_000 })

import { useState, useEffect, useCallback, useRef } from 'react'

// Caché en memoria (se borra al recargar)
const CACHE = new Map()

export function useApi(fn, ...rest) {
  // Separa opciones del último arg si las hay
  const lastArg  = rest[rest.length - 1]
  const hasOpts  = lastArg && typeof lastArg === 'object' && !Array.isArray(lastArg) &&
                   ('skip' in lastArg || 'ttl' in lastArg)
  const options  = hasOpts ? rest.pop() : {}
  const args     = rest

  const { skip = false, ttl = 30_000 } = options
  const cacheKey = `${fn?.name}:${JSON.stringify(args)}`

  const [state, setState] = useState(() => {
    const hit = CACHE.get(cacheKey)
    if (hit && Date.now() - hit.ts < ttl) return { data: hit.data, loading: false, error: null }
    return { data: null, loading: !skip, error: null }
  })

  const mounted = useRef(true)

  const run = useCallback(async (force = false) => {
    if (skip) return

    if (!force) {
      const hit = CACHE.get(cacheKey)
      if (hit && Date.now() - hit.ts < ttl) {
        setState({ data: hit.data, loading: false, error: null })
        return
      }
    }

    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const result = await fn(...args)
      CACHE.set(cacheKey, { data: result, ts: Date.now() })
      if (mounted.current) setState({ data: result, loading: false, error: null })
    } catch (err) {
      if (mounted.current) setState({ data: null, loading: false, error: err.message })
    }
  }, [cacheKey, skip, ttl]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mounted.current = true
    run()
    return () => { mounted.current = false }
  }, [run])

  return { ...state, refetch: () => run(true) }
}

// ─── Polling (live scores) ────────────────────────────
export function useApiPolling(fn, intervalMs = 30_000, ...args) {
  const result = useApi(fn, ...args, { ttl: 0 })

  useEffect(() => {
    const id = setInterval(result.refetch, intervalMs)
    return () => clearInterval(id)
  }, [result.refetch, intervalMs])

  return result
}

export function clearCache(fnName, ...args) {
  if (fnName) CACHE.delete(`${fnName}:${JSON.stringify(args)}`)
  else CACHE.clear()
}
