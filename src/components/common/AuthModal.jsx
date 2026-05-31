import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLang } from '../../context/LangContext'
import logo from '../../assets/img/myc-logo-main.png'
import './AuthModal.css'

// ── Campo de texto genérico ──────────────────────────────────────────
function Field({ label, type = 'text', value, onChange, placeholder, autoComplete }) {
  return (
    <div className="auth-field">
      <label className="auth-label">{label}</label>
      <input
        className="input"
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
    </div>
  )
}

// ── Campo de contraseña con ojito ────────────────────────────────────
function PasswordField({ label, value, onChange, placeholder, autoComplete }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="auth-field">
      <label className="auth-label">{label}</label>
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

// ── Mensaje de error ─────────────────────────────────────────────────
function ErrorMsg({ msg }) {
  if (!msg) return null
  return (
    <div className="auth-error" role="alert">
      <i className="fa-solid fa-circle-exclamation" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
      {msg}
    </div>
  )
}

// ── Formulario Sign In ───────────────────────────────────────────────
function SignInForm({ onSwitch, onForgot }) {
  const { login }   = useAuth()
  const { lang }    = useLang()
  const [email,    setEmail   ] = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError   ] = useState('')
  const [loading,  setLoading ] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <ErrorMsg msg={error} />

      <Field
        label={lang === 'es' ? 'Correo electrónico' : 'Email'}
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="tu@email.com"
        autoComplete="email"
      />

      <PasswordField
        label={lang === 'es' ? 'Contraseña' : 'Password'}
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="••••••••"
        autoComplete="current-password"
      />

      {/* Olvidaste tu contraseña */}
      <div style={{ textAlign: 'right', marginTop: -6 }}>
        <button type="button" className="auth-link-btn" onClick={onForgot}>
          {lang === 'es' ? '¿Olvidaste tu contraseña?' : 'Forgot your password?'}
        </button>
      </div>

      <button
        type="submit"
        className="btn btn-gold"
        disabled={loading || !email || !password}
        style={{ marginTop: 2 }}
      >
        {loading
          ? <><i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> {lang === 'es' ? 'Entrando...' : 'Signing in...'}</>
          : <><i className="fa-solid fa-arrow-right-to-bracket" aria-hidden="true" /> {lang === 'es' ? 'Iniciar sesión' : 'Sign In'}</>
        }
      </button>

      <div className="auth-footer">
        {lang === 'es' ? '¿No tienes cuenta?' : "Don't have an account?"}
        <button type="button" onClick={onSwitch}>
          {lang === 'es' ? 'Regístrate' : 'Sign Up'}
        </button>
      </div>
    </form>
  )
}

// ── Formulario Sign Up ───────────────────────────────────────────────
function SignUpForm({ onSwitch }) {
  const { register } = useAuth()
  const { lang }     = useLang()
  const [form,    setForm   ] = useState({ first_name: '', last_name: '', email: '', password: '', confirm: '' })
  const [error,   setError  ] = useState('')
  const [loading, setLoading] = useState(false)

  const set = key => e => setForm(prev => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) {
      setError(lang === 'es' ? 'Las contraseñas no coinciden' : 'Passwords do not match')
      return
    }
    if (form.password.length < 6) {
      setError(lang === 'es' ? 'Mínimo 6 caracteres en la contraseña' : 'Password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      await register({ first_name: form.first_name, last_name: form.last_name, email: form.email, password: form.password })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const ready = form.first_name && form.last_name && form.email && form.password && form.confirm

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <ErrorMsg msg={error} />

      <div className="auth-form-row">
        <Field
          label={lang === 'es' ? 'Nombre' : 'First Name'}
          value={form.first_name}
          onChange={set('first_name')}
          placeholder={lang === 'es' ? 'Juan' : 'John'}
          autoComplete="given-name"
        />
        <Field
          label={lang === 'es' ? 'Apellido' : 'Last Name'}
          value={form.last_name}
          onChange={set('last_name')}
          placeholder={lang === 'es' ? 'García' : 'Doe'}
          autoComplete="family-name"
        />
      </div>

      <Field
        label={lang === 'es' ? 'Correo electrónico' : 'Email'}
        type="email"
        value={form.email}
        onChange={set('email')}
        placeholder="tu@email.com"
        autoComplete="email"
      />

      <PasswordField
        label={lang === 'es' ? 'Contraseña' : 'Password'}
        value={form.password}
        onChange={set('password')}
        placeholder={lang === 'es' ? 'Mínimo 6 caracteres' : 'At least 6 characters'}
        autoComplete="new-password"
      />

      <PasswordField
        label={lang === 'es' ? 'Confirmar contraseña' : 'Confirm Password'}
        value={form.confirm}
        onChange={set('confirm')}
        placeholder="••••••••"
        autoComplete="new-password"
      />

      <button
        type="submit"
        className="btn btn-gold"
        disabled={loading || !ready}
        style={{ marginTop: 2 }}
      >
        {loading
          ? <><i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> {lang === 'es' ? 'Creando cuenta...' : 'Creating account...'}</>
          : <><i className="fa-solid fa-user-plus" aria-hidden="true" /> {lang === 'es' ? 'Crear cuenta' : 'Create Account'}</>
        }
      </button>

      <div className="auth-footer">
        {lang === 'es' ? '¿Ya tienes cuenta?' : 'Already have an account?'}
        <button type="button" onClick={onSwitch}>
          {lang === 'es' ? 'Inicia sesión' : 'Sign In'}
        </button>
      </div>
    </form>
  )
}

// ── Vista: Olvidaste tu contraseña ───────────────────────────────────
function ForgotForm({ onBack }) {
  const { forgotPassword } = useAuth()
  const { lang }           = useLang()
  const [email,   setEmail  ] = useState('')
  const [error,   setError  ] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent   ] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="auth-form" style={{ alignItems: 'center', textAlign: 'center', paddingTop: 12 }}>
        <div style={{ fontSize: 42, color: 'var(--gold)', marginBottom: 8 }}>
          <i className="fa-solid fa-envelope-circle-check" aria-hidden="true" />
        </div>
        <div className="fw-600" style={{ fontSize: 15, color: 'var(--text)', marginBottom: 6 }}>
          {lang === 'es' ? '¡Correo enviado!' : 'Email sent!'}
        </div>
        <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6, margin: '0 0 20px' }}>
          {lang === 'es'
            ? 'Revisa tu bandeja de entrada. El enlace expira en 1 hora.'
            : 'Check your inbox. The link expires in 1 hour.'}
        </p>
        <button type="button" className="btn btn-outline" onClick={onBack} style={{ width: '100%' }}>
          {lang === 'es' ? '← Volver al inicio de sesión' : '← Back to Sign In'}
        </button>
      </div>
    )
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <p style={{ fontSize: 13, color: 'var(--text3)', margin: '0 0 4px', lineHeight: 1.6 }}>
        {lang === 'es'
          ? 'Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.'
          : 'Enter your email and we\'ll send you a link to set a new password.'}
      </p>

      <ErrorMsg msg={error} />

      <Field
        label={lang === 'es' ? 'Correo electrónico' : 'Email'}
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="tu@email.com"
        autoComplete="email"
      />

      <button
        type="submit"
        className="btn btn-gold"
        disabled={loading || !email}
      >
        {loading
          ? <><i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> {lang === 'es' ? 'Enviando...' : 'Sending...'}</>
          : <><i className="fa-solid fa-paper-plane" aria-hidden="true" /> {lang === 'es' ? 'Enviar enlace' : 'Send Link'}</>
        }
      </button>

      <div className="auth-footer">
        <button type="button" onClick={onBack}>
          {lang === 'es' ? '← Volver al inicio de sesión' : '← Back to Sign In'}
        </button>
      </div>
    </form>
  )
}

// ── Modal principal ──────────────────────────────────────────────────
export default function AuthModal() {
  const { authModalOpen, setAuthModalOpen, authModalView } = useAuth()
  const { lang }   = useLang()
  const [view, setView] = useState('signin')   // 'signin' | 'signup' | 'forgot'
  const overlayRef = useRef(null)

  // Cerrar con Escape
  useEffect(() => {
    if (!authModalOpen) return
    const onKey = e => { if (e.key === 'Escape') setAuthModalOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [authModalOpen, setAuthModalOpen])

  // Bloquear scroll del body
  useEffect(() => {
    document.body.style.overflow = authModalOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [authModalOpen])

  // Resetear vista al abrir (respeta la pestaña solicitada)
  useEffect(() => {
    if (authModalOpen) setView(authModalView || 'signin')
  }, [authModalOpen, authModalView])

  if (!authModalOpen) return null

  const handleOverlayClick = e => {
    if (e.target === overlayRef.current) setAuthModalOpen(false)
  }

  const isForgot = view === 'forgot'

  const titles = {
    signin: lang === 'es' ? 'Iniciar sesión' : 'Sign In',
    signup: lang === 'es' ? 'Crear cuenta'   : 'Create Account',
    forgot: lang === 'es' ? 'Recuperar contraseña' : 'Reset Password',
  }

  return (
    <div className="auth-overlay" ref={overlayRef} onClick={handleOverlayClick} role="dialog" aria-modal="true" aria-label={titles[view]}>
      <div className="auth-card">

        {/* Header */}
        <div className="auth-card-header">
          <div className="auth-card-logo">
            {isForgot ? (
              <>
                <button type="button" className="auth-back-btn" onClick={() => setView('signin')}>
                  <i className="fa-solid fa-arrow-left" aria-hidden="true" />
                </button>
                <span className="auth-card-title">{titles.forgot}</span>
              </>
            ) : (
              <img src={logo} alt="My World Cup" className="auth-card-logo-img" />
            )}
          </div>
          <button
            className="auth-close-btn"
            onClick={() => setAuthModalOpen(false)}
            aria-label={lang === 'es' ? 'Cerrar' : 'Close'}
          >
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>

        {/* Tabs (solo en signin/signup) */}
        {!isForgot && (
          <div className="auth-tabs" role="tablist">
            <button
              className={`auth-tab${view === 'signin' ? ' active' : ''}`}
              onClick={() => setView('signin')}
              role="tab" aria-selected={view === 'signin'}
            >
              <i className="fa-solid fa-arrow-right-to-bracket" style={{ marginRight: 6 }} aria-hidden="true" />
              {lang === 'es' ? 'Iniciar sesión' : 'Sign In'}
            </button>
            <button
              className={`auth-tab${view === 'signup' ? ' active' : ''}`}
              onClick={() => setView('signup')}
              role="tab" aria-selected={view === 'signup'}
            >
              <i className="fa-solid fa-user-plus" style={{ marginRight: 6 }} aria-hidden="true" />
              {lang === 'es' ? 'Registrarse' : 'Sign Up'}
            </button>
          </div>
        )}

        {/* Formulario activo */}
        {view === 'signin' && <SignInForm onSwitch={() => setView('signup')} onForgot={() => setView('forgot')} />}
        {view === 'signup' && <SignUpForm onSwitch={() => setView('signin')} />}
        {view === 'forgot' && <ForgotForm onBack={() => setView('signin')} />}

      </div>
    </div>
  )
}
