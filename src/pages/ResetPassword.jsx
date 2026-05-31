import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import logo from '../assets/img/myc-logo-main.png'

// ── Campo contraseña con ojito ──────────────────────────────────────
function PasswordField({ label, value, onChange, placeholder, autoComplete }) {
  const [visible, setVisible] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          className="input"
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          style={{ paddingRight: 42 }}
        />
        <button
          type="button"
          className="auth-eye-btn"
          onClick={() => setVisible(v => !v)}
          aria-label={visible ? 'Ocultar contraseña' : 'Ver contraseña'}
          tabIndex={-1}
        >
          <i className={`fa-solid fa-eye${visible ? '-slash' : ''}`} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

export default function ResetPassword() {
  const { resetPassword, openAuthModal } = useAuth()
  const { lang }       = useLang()
  const [params]       = useSearchParams()
  const navigate       = useNavigate()

  const token = params.get('token') || ''

  const [password, setPassword]   = useState('')
  const [confirm,  setConfirm ]   = useState('')
  const [error,    setError   ]   = useState('')
  const [loading,  setLoading ]   = useState(false)
  const [success,  setSuccess ]   = useState(false)

  // Sin token → redirigir
  useEffect(() => {
    if (!token) navigate('/', { replace: true })
  }, [token, navigate])

  if (!token) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError(lang === 'es' ? 'Las contraseñas no coinciden' : 'Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError(lang === 'es' ? 'Mínimo 6 caracteres' : 'At least 6 characters')
      return
    }

    setLoading(true)
    try {
      await resetPassword(token, password)
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-content page-enter" style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
      <div className="card" style={{
        width: '100%', maxWidth: 420,
        border: '1px solid rgba(240,180,41,0.18)',
        borderRadius: 18, overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      }}>

        {/* Header */}
        <div style={{
          padding: '22px 24px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <img src={logo} alt="My World Cup" style={{ height: 44, width: 'auto', display: 'block' }} />
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 14,
            background: 'var(--gold-grad)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text', letterSpacing: 0.5,
          }}>
            {lang === 'es' ? 'Nueva contraseña' : 'New Password'}
          </div>
        </div>

        {/* Contenido */}
        {success ? (
          <div style={{ padding: '32px 24px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: 44, color: 'var(--gold)', marginBottom: 12 }}>
              <i className="fa-solid fa-circle-check" aria-hidden="true" />
            </div>
            <div className="fw-600" style={{ fontSize: 16, color: 'var(--text)', marginBottom: 8 }}>
              {lang === 'es' ? '¡Contraseña actualizada!' : 'Password updated!'}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24, lineHeight: 1.6 }}>
              {lang === 'es'
                ? 'Tu contraseña ha sido cambiada exitosamente. Ya puedes iniciar sesión.'
                : 'Your password has been changed. You can now sign in.'}
            </p>
            <button
              className="btn btn-gold"
              style={{ width: '100%' }}
              onClick={() => { navigate('/'); openAuthModal('signin') }}
            >
              <i className="fa-solid fa-arrow-right-to-bracket" aria-hidden="true" />
              {lang === 'es' ? 'Iniciar sesión' : 'Sign In'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate style={{ padding: '20px 24px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>

            <p style={{ fontSize: 13, color: 'var(--text3)', margin: '0 0 4px', lineHeight: 1.6 }}>
              {lang === 'es'
                ? 'Elige una nueva contraseña para tu cuenta.'
                : 'Choose a new password for your account.'}
            </p>

            {error && (
              <div className="auth-error" role="alert">
                <i className="fa-solid fa-circle-exclamation" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
                {error}
              </div>
            )}

            <PasswordField
              label={lang === 'es' ? 'Nueva contraseña' : 'New Password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={lang === 'es' ? 'Mínimo 6 caracteres' : 'At least 6 characters'}
              autoComplete="new-password"
            />

            <PasswordField
              label={lang === 'es' ? 'Confirmar contraseña' : 'Confirm Password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />

            <button
              type="submit"
              className="btn btn-gold"
              disabled={loading || !password || !confirm}
              style={{ marginTop: 4 }}
            >
              {loading
                ? <><i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> {lang === 'es' ? 'Guardando...' : 'Saving...'}</>
                : <><i className="fa-solid fa-floppy-disk" aria-hidden="true" /> {lang === 'es' ? 'Guardar nueva contraseña' : 'Save New Password'}</>
              }
            </button>

          </form>
        )}

      </div>
    </div>
  )
}
