import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useLang } from '../context/LangContext'
import { useAuth } from '../context/AuthContext'
import MatchCard from '../components/common/MatchCard'
import '../components/common/MatchCard.css'

// ── Per-tab empty state ──────────────────────────────────────────────────────
function TabEmpty({ icon, title, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text3)' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <i className={`fa-solid ${icon}`} style={{ fontSize: 36, opacity: 0.35 }} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13 }}>{sub}</div>
    </div>
  )
}

export default function Favorites() {
  const { favorites, toggleFav } = useApp()
  const { t, lang }              = useLang()
  const { user, openAuthModal } = useAuth()
  const navigate                 = useNavigate()
  const [activeTab, setActiveTab] = useState('teams')

  // ── Not logged in → prompt to sign in ──────────────────────────────────────
  if (!user) {
    return (
      <div className="page-content page-enter">
        <h1 className="section-title mb-24"><span>{t('nav', 'favorites')}</span></h1>
        <div className="card" style={{ textAlign: 'center', padding: '56px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <i className="fa-regular fa-heart" style={{ fontSize: 52, color: 'var(--gold)', opacity: 0.8 }} />
              <i className="fa-solid fa-lock" style={{
                fontSize: 18, color: 'var(--gold)',
                position: 'absolute', bottom: -4, right: -8,
                background: 'var(--card)', borderRadius: '50%', padding: 3,
              }} />
            </span>
          </div>
          <h2 className="fw-600" style={{ fontSize: 18, marginBottom: 10 }}>
            {t('favorites', 'login_required')}
          </h2>
          <p className="text-muted" style={{ fontSize: 13, maxWidth: 340, margin: '0 auto 28px' }}>
            {t('favorites', 'login_required_sub')}
          </p>
          <div className="flex gap-12" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-gold" onClick={() => openAuthModal('signin')}>
              <i className="fa-solid fa-right-to-bracket" style={{ marginRight: 8 }} />
              {t('favorites', 'sign_in')}
            </button>
            <button className="btn btn-outline" onClick={() => openAuthModal('signup')}>
              <i className="fa-solid fa-user-plus" style={{ marginRight: 8 }} />
              {t('favorites', 'create_account')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const favTeams    = (favorites.teams    || []).filter(x => x?.id != null)
  const favPlayers  = (favorites.players  || []).filter(x => x?.id != null)
  const favMatches  = (favorites.matches  || []).filter(x => x?.id != null)
  const favArticles = (favorites.articles || []).filter(x => x?.id != null)

  const isEmpty = !favTeams.length && !favPlayers.length && !favMatches.length && !favArticles.length

  const TABS = [
    { key: 'teams',    label: lang === 'es' ? 'Equipos'    : 'Teams',    count: favTeams.length    },
    { key: 'players',  label: lang === 'es' ? 'Jugadores'  : 'Players',  count: favPlayers.length  },
    { key: 'matches',  label: lang === 'es' ? 'Partidos'   : 'Matches',  count: favMatches.length  },
    { key: 'articles', label: lang === 'es' ? 'Noticias'   : 'News',     count: favArticles.length },
  ]

  return (
    <div className="page-content page-enter">

      {/* ── Header — title left, badges right; wraps on narrow screens ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px 16px', marginBottom: 24 }}>
        <h1 className="section-title"><span>{t('nav', 'favorites')}</span></h1>
        <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
          <span className="badge badge-gold">{favTeams.length} {lang === 'es' ? 'equipos' : 'teams'}</span>
          <span className="badge badge-blue">{favPlayers.length} {lang === 'es' ? 'jugadores' : 'players'}</span>
          <span className="badge badge-green">{favMatches.length} {lang === 'es' ? 'partidos' : 'matches'}</span>
          <span className="badge" style={{ background: 'rgba(240,180,41,0.12)', color: 'var(--gold)', border: '1px solid rgba(240,180,41,0.25)' }}>
            {favArticles.length} {lang === 'es' ? 'noticias' : 'news'}
          </span>
        </div>
      </div>

      {/* ── Global empty banner (shown above tabs when nothing is saved yet) ── */}
      {isEmpty && (
        <div className="card mb-24" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <i className="fa-regular fa-heart" style={{ fontSize: 44, color: 'var(--gold)', opacity: 0.7 }} />
        </div>
          <h2 className="fw-600 mb-8" style={{ fontSize: 18 }}>{t('favorites', 'no_favs')}</h2>
          <p className="text-muted mb-16" style={{ fontSize: 13 }}>{t('favorites', 'no_favs_sub')}</p>
          <div className="flex gap-8" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-gold"    onClick={() => navigate('/teams')}>
              <i className="fa-solid fa-shield-halved" style={{ marginRight: 6 }} />
              {t('favorites', 'browse_teams')}
            </button>
            <button className="btn btn-outline" onClick={() => navigate('/players')}>
              <i className="fa-solid fa-users" style={{ marginRight: 6 }} />
              {t('favorites', 'browse_players')}
            </button>
            <button className="btn btn-outline" onClick={() => navigate('/matches')}>
              <i className="fa-solid fa-futbol" style={{ marginRight: 6 }} />
              {lang === 'es' ? 'Ver partidos' : 'Browse Matches'}
            </button>
            <button className="btn btn-outline" onClick={() => navigate('/news')}>
              <i className="fa-solid fa-newspaper" style={{ marginRight: 6 }} />
              {lang === 'es' ? 'Ver noticias' : 'Browse News'}
            </button>
          </div>
        </div>
      )}

      {/* ── Tabs — always visible, scroll-tabs so they work on any width ── */}
      <div className="scroll-tabs mb-16" role="tablist" aria-label={t('nav', 'favorites')}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`scroll-tab${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
            role="tab"
            aria-selected={activeTab === tab.key}
          >
            {tab.label}
            <span style={{
              marginLeft: 6, fontSize: 10,
              background: activeTab === tab.key ? 'rgba(240,180,41,0.2)' : 'rgba(255,255,255,0.08)',
              color: activeTab === tab.key ? 'var(--gold)' : 'var(--text3)',
              borderRadius: 10, padding: '1px 6px', fontWeight: 700,
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Teams ── */}
      {activeTab === 'teams' && (
        favTeams.length === 0
          ? <TabEmpty
              icon="fa-shield-halved"
              title={t('favorites', 'no_teams')}
              sub={lang === 'es' ? 'Toca el corazón en cualquier equipo para guardarlo.' : 'Tap the heart on any team to save it.'}
            />
          : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
              {favTeams.map(team => (
                <div
                  key={team.id}
                  className="card card-clickable"
                  style={{ textAlign: 'center' }}
                  onClick={() => navigate(`/teams/${team.id}`, { state: { team } })}
                >
                  {team.flag && typeof team.flag === 'string' && team.flag.startsWith('http')
                    ? <img src={team.flag} alt={team.name} style={{ width: 56, height: 56, objectFit: 'contain', marginBottom: 8 }} onError={e => { e.target.style.display = 'none' }} />
                    : <div style={{ width: 56, height: 56, borderRadius: 12, background: 'rgba(240,180,41,0.08)', border: '1px solid rgba(240,180,41,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, margin: '0 auto 8px' }}>
                        <i className="fa-solid fa-shield-halved" style={{ fontSize: 24, color: 'var(--gold)', opacity: 0.6 }} />
                      </div>
                  }
                  <div className="fw-600 mb-4">{team.name}</div>
                  <div className="caption mb-8">{team.rank ? `FIFA #${team.rank}` : team.confederation || '—'}</div>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={e => { e.stopPropagation(); toggleFav('teams', team) }}
                  >
                    <i className="fa-solid fa-heart-crack" style={{ marginRight: 5 }} />
                    {t('favorites', 'remove')}
                  </button>
                </div>
              ))}
            </div>
      )}

      {/* ── Players ── */}
      {activeTab === 'players' && (
        favPlayers.length === 0
          ? <TabEmpty
              icon="fa-users"
              title={t('favorites', 'no_players')}
              sub={lang === 'es' ? 'Toca el corazón en cualquier jugador para guardarlo.' : 'Tap the heart on any player to save them.'}
            />
          : <div className="grid-2">
              {favPlayers.map(player => (
                <div
                  key={player.id}
                  className="card card-clickable flex gap-12"
                  style={{ alignItems: 'flex-start' }}
                  onClick={() => navigate(`/players/${player.id}`, { state: { player } })}
                >
                  {player.photo
                    ? <img src={player.photo} alt={player.name} style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(240,180,41,0.2)', flexShrink: 0 }} onError={e => { e.target.style.display = 'none' }} />
                    : <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(240,180,41,0.08)', border: '2px solid rgba(240,180,41,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="fa-solid fa-user" style={{ color: 'var(--gold)', fontSize: 20 }} />
                      </div>
                  }
                  <div style={{ flex: 1 }}>
                    <div className="fw-600 mb-4">{player.name} {player.flag}</div>
                    <div className="caption mb-8">{player.pos} · {player.club}</div>
                    <div className="flex gap-12">
                      <div className="pstat"><div className="pstat-val">{player.goals}</div><div className="pstat-lbl">{t('common', 'goals')}</div></div>
                      <div className="pstat"><div className="pstat-val">{player.assists}</div><div className="pstat-lbl">{t('common', 'assists')}</div></div>
                      <div className="pstat"><div className="pstat-val">{player.rating}</div><div className="pstat-lbl">{t('common', 'rating')}</div></div>
                    </div>
                  </div>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={e => { e.stopPropagation(); toggleFav('players', player) }}
                  >
                    <i className="fa-solid fa-heart-crack" />
                  </button>
                </div>
              ))}
            </div>
      )}

      {/* ── Matches ── */}
      {activeTab === 'matches' && (
        favMatches.length === 0
          ? <TabEmpty
              icon="fa-futbol"
              title={t('favorites', 'no_matches')}
              sub={lang === 'es' ? 'Toca el corazón en cualquier partido para guardarlo.' : 'Tap the heart on any match to save it.'}
            />
          : <div className="grid-2">
              {favMatches.map(m => <MatchCard key={m.id} match={m} />)}
            </div>
      )}

      {/* ── Articles ── */}
      {activeTab === 'articles' && (
        favArticles.length === 0
          ? <TabEmpty
              icon="fa-newspaper"
              title={lang === 'es' ? 'No hay noticias guardadas' : 'No saved news yet'}
              sub={lang === 'es' ? 'Toca el marcador en cualquier noticia para guardarla.' : 'Tap the bookmark on any article to save it.'}
            />
          : <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {favArticles.map((article, i) => (
                <div
                  key={article.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px',
                    borderBottom: i < favArticles.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  }}
                >
                  {/* Category icon */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                    background: `${article.color || '#64748b'}18`,
                    border: `1px solid ${article.color || '#64748b'}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <i className="fa-solid fa-newspaper" style={{ fontSize: 14, color: article.color || '#64748b' }} />
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 600, fontSize: 13, lineHeight: 1.4, color: 'var(--text)',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 4,
                    }}>
                      {article.title}
                    </div>
                    {(article.excerpt || article.description) && (
                      <div style={{
                        fontSize: 11, color: 'var(--text3)', lineHeight: 1.5,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 6,
                      }}>
                        {article.excerpt || article.description}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: '0.05em',
                        padding: '2px 7px', borderRadius: 8,
                        background: `${article.color || '#64748b'}18`,
                        color: article.color || '#64748b',
                        border: `1px solid ${article.color || '#64748b'}44`,
                      }}>
                        {article.catLabel || article.cat}
                      </span>
                      {article.source && <span style={{ fontSize: 10, color: 'var(--text3)' }}>{article.source}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                    {article.url && (
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-gold btn-sm"
                        style={{ textDecoration: 'none', fontSize: 11 }}
                      >
                        <i className="fa-solid fa-arrow-up-right-from-square" />
                      </a>
                    )}
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: 11 }}
                      onClick={() => toggleFav('articles', article)}
                      aria-label={lang === 'es' ? 'Quitar de guardados' : 'Remove from saved'}
                    >
                      <i className="fa-solid fa-trash" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
      )}

    </div>
  )
}
