import React from 'react'
import { useLang } from '../context/LangContext'
import logo from '../assets/img/myc-logo-main.png'
import erickPic from '../assets/img/erick-picture.png'
import './AboutPage.css'

// ── Tech stack pills ────────────────────────────────────────────────
const STACK = [
  { label: 'React',          icon: 'fa-brands fa-react',      color: '#61dafb' },
  { label: 'Flask',          icon: 'fa-brands fa-python',     color: '#4ade80' },
  { label: 'PostgreSQL',     icon: 'fa-solid fa-database',    color: '#60a5fa' },
  { label: 'Vite',           icon: 'fa-solid fa-bolt',        color: '#f0b429' },
  { label: 'JWT Auth',       icon: 'fa-solid fa-lock',        color: '#a78bfa' },
  { label: 'Claude AI',      icon: 'fa-solid fa-robot',       color: '#f97316' },
  { label: 'API-Sports',     icon: 'fa-solid fa-futbol',      color: '#10b981' },
  { label: 'Resend',         icon: 'fa-solid fa-envelope',    color: '#06b6d4' },
]

// ── Feature highlights ───────────────────────────────────────────────
function Features({ es }) {
  const items = es ? [
    { icon: 'fa-futbol',        text: 'Partidos en vivo con estadísticas en tiempo real' },
    { icon: 'fa-shield-halved', text: 'Perfiles de los 48 equipos del Mundial 2026' },
    { icon: 'fa-users',         text: 'Base de datos de jugadores con métricas detalladas' },
    { icon: 'fa-robot',         text: 'Predictor de partidos con inteligencia artificial' },
    { icon: 'fa-brain',         text: 'Trivia interactiva generada por IA' },
    { icon: 'fa-heart',         text: 'Sistema de favoritos sincronizado en la nube' },
    { icon: 'fa-bell',          text: 'Notificaciones por email de tus favoritos' },
    { icon: 'fa-newspaper',     text: 'Noticias en tiempo real del Mundial' },
  ] : [
    { icon: 'fa-futbol',        text: 'Live matches with real-time statistics' },
    { icon: 'fa-shield-halved', text: 'Profiles of all 48 World Cup 2026 teams' },
    { icon: 'fa-users',         text: 'Player database with detailed metrics' },
    { icon: 'fa-robot',         text: 'AI-powered match predictor' },
    { icon: 'fa-brain',         text: 'Interactive AI-generated trivia' },
    { icon: 'fa-heart',         text: 'Cloud-synced favorites system' },
    { icon: 'fa-bell',          text: 'Email notifications for your favorites' },
    { icon: 'fa-newspaper',     text: 'Real-time World Cup news feed' },
  ]

  return (
    <div className="about-features-grid">
      {items.map((f, i) => (
        <div key={i} className="about-feature-item">
          <i className={`fa-solid ${f.icon} about-feature-icon`} />
          <span>{f.text}</span>
        </div>
      ))}
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────────
export default function AboutPage() {
  const { lang } = useLang()
  const es = lang === 'es'

  return (
    <div className="page-content page-enter">

      {/* ── Hero ── */}
      <div className="about-hero">
        <img src={logo} alt="My World Cup" className="about-logo" />
        <h1 className="about-title">My World Cup 2026</h1>
        <p className="about-tagline">
          {es
            ? 'La app definitiva para seguir el Mundial FIFA 2026'
            : 'The ultimate companion for FIFA World Cup 2026'}
        </p>
      </div>

      {/* ── About the app ── */}
      <div className="card about-card mb-16">
        <div className="about-section-title">
          <i className="fa-solid fa-circle-info" />
          {es ? 'Sobre la aplicación' : 'About the app'}
        </div>
        <p className="about-text">
          {es
            ? 'My World Cup 2026 nació como un proyecto personal apasionado por el fútbol y la tecnología. Una app completa, moderna y gratuita para que los fanáticos del Mundial puedan seguir cada partido, equipo y jugador del torneo más grande del planeta — sin pagar una suscripción.'
            : 'My World Cup 2026 was born as a personal project fueled by a passion for football and technology. A complete, modern, free app so fans can follow every match, team and player of the biggest tournament on the planet — no subscription required.'}
        </p>
        <Features es={es} />
      </div>

      {/* ── Stack tecnológico ── */}
      <div className="card about-card mb-16">
        <div className="about-section-title">
          <i className="fa-solid fa-code" />
          {es ? 'Tecnologías utilizadas' : 'Built with'}
        </div>
        <div className="about-stack">
          {STACK.map(s => (
            <span key={s.label} className="about-stack-chip" style={{ '--chip-color': s.color }}>
              <i className={s.icon} style={{ color: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Creador ── */}
      <div className="card about-card mb-16">
        <div className="about-section-title">
          <i className="fa-solid fa-user-astronaut" />
          {es ? 'El creador' : 'The creator'}
        </div>

        <div className="about-creator">
          <img
            src={erickPic}
            alt="Erick De los Reyes"
            className="about-creator-avatar about-creator-avatar--photo"
          />
          <div className="about-creator-info">
            <div className="about-creator-name">Erick De los Reyes</div>
            <div className="about-creator-role">
              {es ? 'Desarrollador & Diseñador · Miami, FL' : 'Developer & Designer · Miami, FL'}
            </div>
            <p className="about-creator-bio">
              {es
                ? 'Apasionado por construir productos digitales con buena experiencia de usuario. Esta app es un proyecto personal que combina mi amor por el fútbol con el desarrollo web moderno.'
                : 'Passionate about building digital products with great user experience. This app is a personal project combining my love for football with modern web development.'}
            </p>

            {/* ── Social links ── */}
            <div className="about-social">
              <a
                href="https://www.linkedin.com/in/erickdelosreyes/"
                target="_blank"
                rel="noopener noreferrer"
                className="about-social-btn about-social-btn--linkedin"
                aria-label="LinkedIn"
              >
                <i className="fa-brands fa-linkedin" />
                LinkedIn
              </a>
              <a
                href="https://github.com/delosreyes305"
                target="_blank"
                rel="noopener noreferrer"
                className="about-social-btn about-social-btn--github"
                aria-label="GitHub"
              >
                <i className="fa-brands fa-github" />
                GitHub
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Buy Me a Coffee ── */}
      <div className="card about-card about-card--coffee mb-16">
        <div className="about-coffee-inner">
          <div className="about-coffee-icon">☕</div>
          <div>
            <div className="about-coffee-title">
              {es ? '¿Te gusta la app?' : 'Enjoying the app?'}
            </div>
            <div className="about-coffee-sub">
              {es
                ? 'Si la app te es útil puedes invitarme un café. ¡Se agradece mucho!'
                : 'If you find the app useful you can buy me a coffee. It means a lot!'}
            </div>
          </div>
        </div>
        {/* ── PLACEHOLDER: reemplaza el href con tu link de Buy Me a Coffee ── */}
        <a
          href="https://buymeacoffee.com/delosreyes305"
          target="_blank"
          rel="noopener noreferrer"
          className="about-coffee-btn"
        >
          ☕ {es ? 'Invítame un café' : 'Buy me a coffee'}
        </a>
      </div>

      {/* ── Footer note ── */}
      <p className="about-footer-note">
        {es
          ? 'Hecho con ❤️ para los fanáticos del fútbol de todo el mundo · No afiliado con FIFA'
          : 'Made with ❤️ for football fans around the world · Not affiliated with FIFA'}
      </p>

    </div>
  )
}
