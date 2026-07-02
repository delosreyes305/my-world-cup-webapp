import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

// ─── Helper: fetch + parse JSON de forma segura ──────────────────────
async function safeFetch(url, options = {}) {
  let res
  try {
    res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    })
  } catch {
    throw new Error('Could not connect to the server. Please try again.')
  }

  let data
  try {
    data = await res.json()
  } catch {
    throw new Error('Server error. Please try again later.')
  }

  return { res, data }
}

// ─── Provider ─────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user,          setUser         ] = useState(null)
  const [token,         setToken        ] = useState(null)
  const [authLoading,   setAuthLoading  ] = useState(true)
  const [authModalOpen,    setAuthModalOpen   ] = useState(false)
  const [authModalView,    setAuthModalView   ] = useState('signin')  // 'signin' | 'signup'
  const [authRequiredOpen, setAuthRequiredOpen] = useState(false)

  // ── Abre el modal en la pestaña indicada ──────────────────────────
  const openAuthModal = useCallback((view = 'signin') => {
    setAuthModalView(view)
    setAuthModalOpen(true)
  }, [])

  // ── Validar token guardado al montar ──────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('mwc_token')
    if (!stored) { setAuthLoading(false); return }

    safeFetch('/api/auth/me', { headers: { Authorization: `Bearer ${stored}` } })
      .then(({ res, data }) => {
        if (res.ok && data?.user) {
          setUser(data.user)
          setToken(stored)
        } else if (res.status === 401 || res.status === 403) {
          // Only clear token on explicit auth rejection — not on server errors or timeouts
          localStorage.removeItem('mwc_token')
        } else {
          // Server error (5xx) or unexpected response — keep token, assume cold start
          setToken(stored)
        }
      })
      .catch(() => {
        // Network error / timeout (Railway cold start) — keep token, user stays logged in
        setToken(stored)
      })
      .finally(() => setAuthLoading(false))
  }, [])

  // ── Login ─────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const { res, data } = await safeFetch('/api/auth/login', {
      method: 'POST',
      body:   JSON.stringify({ email, password }),
    })
    if (!res.ok) throw new Error(data.error || 'Login failed. Please try again.')

    localStorage.setItem('mwc_token', data.access_token)
    setToken(data.access_token)
    setUser(data.user)
    setAuthModalOpen(false)
    return data
  }, [])

  // ── Register ──────────────────────────────────────────────────────
  const register = useCallback(async (formData) => {
    const { res, data } = await safeFetch('/api/auth/register', {
      method: 'POST',
      body:   JSON.stringify(formData),
    })
    if (!res.ok) throw new Error(data.error || 'Registration failed. Please try again.')

    localStorage.setItem('mwc_token', data.access_token)
    setToken(data.access_token)
    setUser(data.user)
    setAuthModalOpen(false)
    return data
  }, [])

  // ── Forgot password ───────────────────────────────────────────────
  const forgotPassword = useCallback(async (email) => {
    const { res, data } = await safeFetch('/api/auth/forgot-password', {
      method: 'POST',
      body:   JSON.stringify({ email }),
    })
    if (!res.ok) throw new Error(data.error || 'Failed to send email. Please try again.')
    return data.message
  }, [])

  // ── Reset password ────────────────────────────────────────────────
  const resetPassword = useCallback(async (token, password) => {
    const { res, data } = await safeFetch('/api/auth/reset-password', {
      method: 'POST',
      body:   JSON.stringify({ token, password }),
    })
    if (!res.ok) throw new Error(data.error || 'Failed to change password. Please try again.')
    return data.message
  }, [])

  // ── Update user (after profile edit) ─────────────────────────────
  const updateUser = useCallback((updates) => {
    setUser(prev => prev ? { ...prev, ...updates } : prev)
  }, [])

  // ── Logout ────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem('mwc_token')
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{
      user, token, authLoading,
      authModalOpen, setAuthModalOpen, authModalView, openAuthModal,
      authRequiredOpen, setAuthRequiredOpen,
      login, register, logout, updateUser,
      forgotPassword, resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}