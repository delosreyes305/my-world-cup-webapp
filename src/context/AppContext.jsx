import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useAuth } from './AuthContext'

const AppContext = createContext(null)

const defaultFavs = { teams: [], players: [], matches: [], articles: [] }

// frontend uses plural ('teams'), API uses singular ('team')
const SINGULAR = { teams: 'team', players: 'player', matches: 'match', articles: 'article' }

function migrateFavs(raw) {
  const clean = arr =>
    Array.isArray(arr) ? arr.filter(x => x && typeof x === 'object' && x.id != null) : []
  return {
    teams:    clean(raw?.teams),
    players:  clean(raw?.players),
    matches:  clean(raw?.matches),
    articles: clean(raw?.articles),
  }
}

// Hash string → positive integer (used as item_id in the API)
function newsHash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0
  }
  return Math.abs(h) || 1
}

function loadLocalFavs() {
  try {
    const stored = JSON.parse(localStorage.getItem('mwc_favs'))
    return stored ? migrateFavs(stored) : defaultFavs
  } catch { return defaultFavs }
}

async function apiFetch(token, path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  })
  // Throw on non-2xx so the catch block in toggleFav can revert the
  // optimistic update instead of silently leaving the UI out of sync.
  if (!res.ok) {
    // flask-jwt-extended uses 'msg', our routes use 'error', some use 'message'
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || body.msg || body.message || `Server error ${res.status}`)
  }
  return res
}

export function AppProvider({ children }) {
  const { user, token, authLoading, setAuthRequiredOpen } = useAuth()

  const [favorites,   setFavorites  ] = useState(defaultFavs)
  const [toast,       setToast      ] = useState(null)
  const [searchOpen,  setSearchOpen ] = useState(false)

  // ── Sync favorites when auth state changes ─────────────────────
  useEffect(() => {
    if (authLoading) return   // wait for stored token to be validated

    if (user && token) {
      // Logged in → load from API
      // Use raw fetch (not apiFetch) to avoid wiping favorites on network error
      fetch('/api/favorites', {
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })
        .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
        .then(data => setFavorites(migrateFavs(data)))
        .catch(err => {
          // Do not wipe favorites on failure — keep current in-memory state
          console.warn('[favorites] GET failed, keeping current state:', err)
        })
    } else {
      // Not logged in → localStorage
      setFavorites(loadLocalFavs())
    }
  }, [user, token, authLoading])

  // Persist to localStorage only when there is no active session
  useEffect(() => {
    if (!user && !authLoading) {
      localStorage.setItem('mwc_favs', JSON.stringify(favorites))
    }
  }, [favorites, user, authLoading])

  const showToast = useCallback((msg, duration = 2500) => {
    setToast(msg)
    setTimeout(() => setToast(null), duration)
  }, [])

  // ── Toggle favorite ────────────────────────────────────────────────
  const toggleFav = useCallback(async (type, item) => {
    if (!item || item.id == null) return

    // No session → show "log in to use favorites" card
    if (!user) {
      setAuthRequiredOpen(true)
      return
    }

    const arr  = favorites[type] || []
    const isIn = arr.some(x => x?.id === item.id)

    // Optimistic update
    setFavorites(prev => {
      const list = prev[type] || []
      return {
        ...prev,
        [type]: isIn
          ? list.filter(x => x?.id !== item.id)
          : [...list, item],
      }
    })

    // Sync with API
    const singularType = SINGULAR[type] || type
    // Articles use URL/UUID as id → convert to integer with hash for the API
    const apiId = type === 'articles' ? newsHash(String(item.id)) : item.id
    try {
      if (isIn) {
        await apiFetch(token, `/api/favorites/${singularType}/${apiId}`, { method: 'DELETE' })
        showToast('Removed from favorites')
      } else {
        await apiFetch(token, '/api/favorites', {
          method: 'POST',
          body:   JSON.stringify({ type: singularType, item_id: apiId, item_data: item }),
        })
        showToast(type === 'articles' ? '📰 Article saved' : `${item.name || 'Item'} added to favorites`)
      }
    } catch (err) {
      // Revert optimistic update on error
      setFavorites(prev => {
        const list = prev[type] || []
        return {
          ...prev,
          [type]: isIn ? [...list, item] : list.filter(x => x?.id !== item.id),
        }
      })
      showToast(err?.message || 'Error saving favorite')
    }
  }, [user, token, favorites, setAuthRequiredOpen, showToast])

  const isFav = useCallback((type, id) => {
    return (favorites[type] || []).some(x => x?.id === id)
  }, [favorites])

  return (
    <AppContext.Provider value={{
      favorites, toggleFav, isFav,
      toast, showToast,
      searchOpen, setSearchOpen,
    }}>
      {children}
      {toast && (
        <div className="notif-toast" role="alert" aria-live="polite">
          {toast}
        </div>
      )}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}