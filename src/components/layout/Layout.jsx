import React, { useState, useRef, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useLang } from '../../context/LangContext'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import SearchOverlay from '../common/SearchOverlay'
import AuthModal from '../common/AuthModal'
import AuthRequired from '../common/AuthRequired'
import '../common/AuthRequired.css'
import LiveTicker from '../common/LiveTicker'
import logo from '../../assets/img/myc-logo-main.png'
import './Layout.css'
import '../common/AuthModal.css'

const NAV_ITEMS = [
  { path: '/',          key: 'home',      icon: <i className="fa-solid fa-house-user"    aria-hidden="true" /> },
  { path: '/matches',   key: 'matches',   icon: <i className="fa-solid fa-futbol"         aria-hidden="true" /> },
  { path: '/teams',     key: 'teams',     icon: <i className="fa-solid fa-shield-halved"  aria-hidden="true" /> },
  { path: '/players',   key: 'players',   icon: <i className="fa-solid fa-users"          aria-hidden="true" /> },
  { path: '/bracket',   key: 'bracket',   icon: <i className="fa-solid fa-trophy"         aria-hidden="true" /> },
  { path: '/news',      key: 'news',      icon: <i className="fa-solid fa-newspaper"      aria-hidden="true" /> },
  { path: '/ranking',   key: 'ranking',   icon: <i className="fa-solid fa-ranking-star"   aria-hidden="true" /> },
  { path: '/trivia',    key: 'trivia',    icon: <i className="fa-solid fa-brain"          aria-hidden="true" /> },
  { path: '/predict',   key: 'predict',   icon: <i className="fa-solid fa-robot"          aria-hidden="true" /> },
  { path: '/favorites', key: 'favorites', icon: <i className="fa-solid fa-heart"          aria-hidden="true" /> },
  { path: '/about',     key: 'about',     icon: <i className="fa-solid fa-circle-info"    aria-hidden="true" /> },
]

// ── Menú desplegable del usuario ─────────────────────────────────────
function UserMenu() {
  const { user, logout, openAuthModal } = useAuth()
  const { lang }    = useLang()
  const navigate    = useNavigate()
  const [open, setOpen] = useState(false)
  const wrapperRef  = useRef(null)

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Cerrar al navegar
  const go = (path) => { setOpen(false); navigate(path) }

  const handleLogout = () => {
    setOpen(false)
    logout()
  }

  // Sin sesión → botón que abre el modal
  if (!user) {
    return (
      <button
        className="user-icon-btn"
        onClick={() => openAuthModal('signin')}
        aria-label={lang === 'es' ? 'Iniciar sesión' : 'Sign in'}
      >
        <i className="fa-solid fa-user fa-lg" aria-hidden="true" />
      </button>
    )
  }

  // Con sesión → icono + dropdown
  const initials = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()

  return (
    <div className="user-menu-wrapper" ref={wrapperRef}>
      <button
        className={`user-icon-btn logged-in${open ? ' open' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-label={lang === 'es' ? 'Menú de usuario' : 'User menu'}
        aria-expanded={open}
      >
        <i className="fa-solid fa-user fa-lg" aria-hidden="true" />
      </button>

      {open && (
        <div className="user-dropdown" role="menu">
          {/* Cabecera con nombre y email */}
          <div className="user-dropdown-header">
            <div className="user-dropdown-avatar" aria-hidden="true">{initials}</div>
            <div className="user-dropdown-name">{user.first_name} {user.last_name}</div>
            <div className="user-dropdown-email">{user.email}</div>
          </div>

          <div className="user-dropdown-divider" />

          {/* Mi cuenta */}
          <button
            className="user-dropdown-item"
            onClick={() => go('/account')}
            role="menuitem"
          >
            <i className="fa-solid fa-circle-user" aria-hidden="true" />
            {lang === 'es' ? 'Mi cuenta' : 'My Account'}
          </button>

          {/* Favoritos rápido */}
          <button
            className="user-dropdown-item"
            onClick={() => go('/favorites')}
            role="menuitem"
          >
            <i className="fa-solid fa-heart" aria-hidden="true" />
            {lang === 'es' ? 'Favoritos' : 'Favorites'}
          </button>

          {/* About */}
          <button
            className="user-dropdown-item"
            onClick={() => go('/about')}
            role="menuitem"
          >
            <i className="fa-solid fa-circle-info" aria-hidden="true" />
            {lang === 'es' ? 'Acerca de' : 'About'}
          </button>

          <div className="user-dropdown-divider" />

          {/* Log Out */}
          <button
            className="user-dropdown-item user-dropdown-item--danger"
            onClick={handleLogout}
            role="menuitem"
          >
            <i className="fa-solid fa-arrow-right-from-bracket" aria-hidden="true" />
            Log Out
          </button>
        </div>
      )}
    </div>
  )
}

// ── Layout principal ─────────────────────────────────────────────────
export default function Layout() {
  const { lang, toggleLang, t } = useLang()
  const { setSearchOpen }       = useApp()

  return (
    <div className="layout">
      {/* Live ticker */}
      <LiveTicker />

      {/* ── Top Navbar ── */}
      <nav className="navbar" role="navigation" aria-label="Main navigation">
        <div className="navbar-inner container">

          {/* Logo */}
          <NavLink to="/" className="nav-logo" aria-label="My World Cup Home">
            <img src={logo} alt="My World Cup" style={{ height: 60, width: 'auto', display: 'block' }} />
          </NavLink>

          {/* Desktop nav links — hidden on mobile/tablet via CSS */}
          <div className="nav-links" role="list">
            {NAV_ITEMS.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                role="listitem"
              >
                <span className="nav-link-icon">{item.icon}</span>
                <span className="nav-label">{t('nav', item.key)}</span>
              </NavLink>
            ))}
          </div>

          {/* Language + Search + User — always visible */}
          <div className="nav-actions">
            <button
              className="lang-toggle"
              onClick={toggleLang}
              aria-label={`Switch to ${lang === 'en' ? 'Spanish' : 'English'}`}
            >
              <img
                src={`https://flagcdn.com/w40/${lang === 'en' ? 'us' : 'es'}.png`}
                alt={lang === 'en' ? 'US flag' : 'ES flag'}
                className="lang-flag"
              />
              <span>{lang === 'en' ? 'EN' : 'ES'}</span>
            </button>

            <button
              className="search-icon-btn"
              onClick={() => setSearchOpen(true)}
              aria-label="Open search"
            >
              <i className="fa-solid fa-magnifying-glass fa-lg" aria-hidden="true" />
            </button>

            {/* Ícono de usuario / dropdown */}
            <UserMenu />
          </div>

        </div>
      </nav>

      {/* Page content */}
      <main id="main-content" className="layout-main">
        <Outlet />
      </main>

      {/* ── Bottom Nav (mobile / tablet only) ── */}
      <nav className="bottom-nav" role="navigation" aria-label="Page navigation">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => `bottom-nav-link${isActive ? ' active' : ''}`}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{t('nav', item.key)}</span>
          </NavLink>
        ))}
      </nav>

      {/* Search overlay */}
      <SearchOverlay />

      {/* Auth modal */}
      <AuthModal />

      {/* Auth required (favoritos sin sesión) */}
      <AuthRequired />
    </div>
  )
}
