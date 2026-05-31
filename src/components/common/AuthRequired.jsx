import React, { useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLang } from '../../context/LangContext'

export default function AuthRequired() {
  const { authRequiredOpen, setAuthRequiredOpen, openAuthModal } = useAuth()
  const { t } = useLang()

  // Cerrar con Escape
  useEffect(() => {
    if (!authRequiredOpen) return
    const onKey = e => { if (e.key === 'Escape') setAuthRequiredOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [authRequiredOpen, setAuthRequiredOpen])

  // Bloquear scroll mientras está abierto
  useEffect(() => {
    document.body.style.overflow = authRequiredOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [authRequiredOpen])

  if (!authRequiredOpen) return null

  const openSignIn = () => {
    setAuthRequiredOpen(false)
    openAuthModal('signin')
  }

  const openSignUp = () => {
    setAuthRequiredOpen(false)
    openAuthModal('signup')
  }

  return (
    <div
      className="auth-required-backdrop"
      onClick={() => setAuthRequiredOpen(false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="auth-required-card"
        onClick={e => e.stopPropagation()}
      >
        {/* Ícono corazón + candado */}
        <div className="auth-required-icon">
          <i className="fa-regular fa-heart" />
          <span className="auth-required-lock">
            <i className="fa-solid fa-lock" />
          </span>
        </div>

        <h2 className="auth-required-title">
          {t('favorites', 'login_required')}
        </h2>
        <p className="auth-required-sub">
          {t('favorites', 'login_required_sub')}
        </p>

        <div className="auth-required-actions">
          <button className="btn btn-gold" onClick={openSignIn}>
            <i className="fa-solid fa-right-to-bracket" />
            {t('favorites', 'sign_in')}
          </button>
          <button className="btn btn-outline" onClick={openSignUp}>
            <i className="fa-solid fa-user-plus" />
            {t('favorites', 'create_account')}
          </button>
        </div>

        <button
          className="auth-required-close"
          onClick={() => setAuthRequiredOpen(false)}
          aria-label="Close"
        >
          <i className="fa-solid fa-xmark" />
        </button>
      </div>
    </div>
  )
}
