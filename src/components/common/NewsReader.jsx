import React, { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useLang } from '../../context/LangContext'
import { useApp } from '../../context/AppContext'

export default function NewsReader({ article, onClose }) {
  const { t, lang }          = useLang()
  const { toggleFav, isFav } = useApp()
  const saved = article ? isFav('articles', article.id) : false

  // ── Escape key closes the reader ──────────────────────
  const handleKey = useCallback(e => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (!article) return
    document.addEventListener('keydown', handleKey)
    // Lock body scroll while open
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [article, handleKey])

  if (!article) return null

  const handleBackdrop = e => {
    if (e.target === e.currentTarget) onClose()
  }

  const openExternal = () => {
    if (article.url) window.open(article.url, '_blank', 'noopener,noreferrer')
  }

  return createPortal(
    <div
      className="news-reader-bg"
      role="dialog"
      aria-modal="true"
      aria-label={article.title}
      onClick={handleBackdrop}
    >
      <div className="news-reader">
        {/* Drag handle — visible on mobile only */}
        <div className="news-reader-handle" aria-hidden="true" />

        {/* Close button */}
        <button
          className="news-reader-close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        {/* Hero image or coloured placeholder */}
        {article.image ? (
          <img
            src={article.image}
            alt=""
            className="news-reader-hero"
            onError={e => {
              e.target.style.display = 'none'
              e.target.nextSibling && (e.target.nextSibling.style.display = 'flex')
            }}
          />
        ) : null}
        {/* Emoji placeholder — visible when no image or image fails */}
        <div
          className="news-reader-hero-placeholder"
          style={{
            background: `linear-gradient(135deg, ${article.color}22, ${article.color}08)`,
            display: article.image ? 'none' : 'flex',
          }}
          aria-hidden="true"
        >
          {article.emoji}
        </div>

        {/* Content */}
        <div className="news-reader-body">

          {/* Category badge + source + time */}
          <div className="news-reader-meta">
            <span
              className="badge"
              style={{
                background: `${article.color}18`,
                color: article.color,
                border: `1px solid ${article.color}44`,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.06em',
              }}
            >
              {article.emoji} {article.catLabel || article.cat}
            </span>
            {article.source && (
              <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>
                {article.source}
              </span>
            )}
            {article.time && (
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                · {article.time}
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="news-reader-title">{article.title}</h2>

          {/* Excerpt / description */}
          {article.excerpt && (
            <p className="news-reader-excerpt">{article.excerpt}</p>
          )}

          {/* Note explaining it's a preview */}
          <p style={{
            fontSize: 11, color: 'var(--text3)', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <span aria-hidden="true">ℹ️</span>
            {t('news', 'preview_note')}
          </p>

          {/* Footer actions — read full takes its own row on mobile */}
          <div className="news-reader-footer" style={{ flexWrap: 'wrap' }}>
            <button
              className="btn btn-gold"
              onClick={openExternal}
              style={{ flex: '1 1 100%' }}
            >
              <i className="fa-solid fa-arrow-up-right-from-square" style={{ marginRight: 8 }} />
              {t('news', 'read_full')}
            </button>
            <button
              className={`btn ${saved ? 'btn-gold' : 'btn-ghost'}`}
              onClick={() => toggleFav('articles', article)}
              style={{ flex: 1 }}
              aria-label={saved
                ? (lang === 'es' ? 'Quitar de guardados' : 'Remove from saved')
                : (lang === 'es' ? 'Guardar noticia'     : 'Save article')}
            >
              <i className={`fa-${saved ? 'solid' : 'regular'} fa-bookmark`} />
              {saved
                ? (lang === 'es' ? 'Guardado' : 'Saved')
                : (lang === 'es' ? 'Guardar'  : 'Save')}
            </button>
            <button
              className="btn btn-ghost"
              onClick={onClose}
              style={{ flex: 1 }}
            >
              ← {t('common', 'back')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
