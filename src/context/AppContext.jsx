import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useAuth } from './AuthContext'

const AppContext = createContext(null)

const defaultFavs = { teams: [], players: [], matches: [], articles: [] }

// frontend usa plural ('teams'), API usa singular ('team')
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

// Hash de string → entero positivo (para usar como item_id en la API)
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
  return fetch(path, {
    ...options,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  })
}

export function AppProvider({ children }) {
  const { user, token, authLoading, setAuthRequiredOpen } = useAuth()

  const [favorites,   setFavorites  ] = useState(defaultFavs)
  const [toast,       setToast      ] = useState(null)
  const [searchOpen,  setSearchOpen ] = useState(false)

  // ── Sincronizar favoritos cuando cambia el estado de auth ─────────
  useEffect(() => {
    if (authLoading) return   // esperar a que se valide el token guardado

    if (user && token) {
      // Logueado → cargar desde API
      apiFetch(token, '/api/favorites')
        .then(r => r.ok ? r.json() : defaultFavs)
        .then(data => setFavorites(migrateFavs(data)))
        .catch(() => setFavorites(defaultFavs))
    } else {
      // No logueado → localStorage
      setFavorites(loadLocalFavs())
    }
  }, [user, token, authLoading])

  // Persistir en localStorage solo cuando no hay sesión activa
  useEffect(() => {
    if (!user && !authLoading) {
      localStorage.setItem('mwc_favs', JSON.stringify(favorites))
    }
  }, [favorites, user, authLoading])

  const showToast = useCallback((msg, duration = 2500) => {
    setToast(msg)
    setTimeout(() => setToast(null), duration)
  }, [])

  // ── Toggle favorito ───────────────────────────────────────────────
  const toggleFav = useCallback(async (type, item) => {
    if (!item || item.id == null) return

    // Sin sesión → mostrar tarjeta "inicia sesión para usar favoritos"
    if (!user) {
      setAuthRequiredOpen(true)
      return
    }

    const arr  = favorites[type] || []
    const isIn = arr.some(x => x?.id === item.id)

    // Actualización optimista
    setFavorites(prev => {
      const list = prev[type] || []
      return {
        ...prev,
        [type]: isIn
          ? list.filter(x => x?.id !== item.id)
          : [...list, item],
      }
    })

    // Sincronizar con API
    const singularType = SINGULAR[type] || type
    // Los artículos usan URL/UUID como id → convertir a entero con hash para la API
    const apiId = type === 'articles' ? newsHash(String(item.id)) : item.id
    try {
      if (isIn) {
        await apiFetch(token, `/api/favorites/${singularType}/${apiId}`, { method: 'DELETE' })
        showToast(user.first_name ? `Eliminado de favoritos` : 'Removed from favorites')
      } else {
        await apiFetch(token, '/api/favorites', {
          method: 'POST',
          body:   JSON.stringify({ type: singularType, item_id: apiId, item_data: item }),
        })
        showToast(type === 'articles' ? '📰 Noticia guardada ♥' : `${item.name || 'Item'} agregado a favoritos ♥`)
      }
    } catch {
      // Revertir en caso de error
      setFavorites(prev => {
        const list = prev[type] || []
        return {
          ...prev,
          [type]: isIn ? [...list, item] : list.filter(x => x?.id !== item.id),
        }
      })
      showToast('Error al actualizar favoritos')
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
  if (!ctx) throw new Error('useApp debe usarse dentro de AppProvider')
  return ctx
}
