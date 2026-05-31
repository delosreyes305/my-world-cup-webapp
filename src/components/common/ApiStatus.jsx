// ─── ApiStatus — Loading / Error / Empty wrapper ─────
// Uso:
//   <ApiStatus loading={loading} error={error} data={data} onRetry={refetch}>
//     <MiComponente />
//   </ApiStatus>

import React from 'react'

export function SkeletonCard({ height = 130 }) {
  return (
    <div className="skeleton" style={{ height, borderRadius: 'var(--radius)', marginBottom: 12 }}
      aria-hidden="true" />
  )
}

export function SkeletonGrid({ count = 4, height = 130 }) {
  return (
    <div className="grid-2">
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} height={height} />)}
    </div>
  )
}

export function SkeletonList({ count = 3, height = 80 }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} height={height} />)}
    </div>
  )
}

export function ErrorBanner({ error, onRetry }) {
  return (
    <div role="alert" style={{
      background: 'rgba(239,68,68,0.08)',
      border: '1px solid rgba(239,68,68,0.2)',
      borderRadius: 'var(--radius)',
      padding: '16px 20px',
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', gap: 12, marginBottom: 16,
    }}>
      <div>
        <div style={{ fontWeight: 600, color: 'var(--red)', marginBottom: 4 }}>⚠️ Error al cargar</div>
        <div style={{ fontSize: 13, color: 'var(--text3)' }}>{error}</div>
      </div>
      {onRetry && (
        <button className="btn btn-sm btn-outline" onClick={onRetry} style={{ flexShrink: 0 }}>
          🔄 Reintentar
        </button>
      )}
    </div>
  )
}

export default function ApiStatus({
  loading, error, data, children,
  skeleton = 'grid', skeletonCount = 4, skeletonHeight = 130,
  onRetry, emptyMessage = 'No hay datos disponibles.',
}) {
  if (loading) {
    if (skeleton === 'none') return (
      <div className="flex-center gap-8"
        style={{ padding: '48px 0', justifyContent: 'center', color: 'var(--text3)' }}
        aria-busy="true">
        <div className="ai-dots" aria-hidden="true"><span /><span /><span /></div>
        Cargando...
      </div>
    )
    return skeleton === 'list'
      ? <SkeletonList count={skeletonCount} height={skeletonHeight} />
      : <SkeletonGrid count={skeletonCount} height={skeletonHeight} />
  }

  if (error) return <ErrorBanner error={error} onRetry={onRetry} />

  const empty = data === null || data === undefined ||
    (Array.isArray(data) && !data.length) ||
    (typeof data === 'object' && !Array.isArray(data) && !Object.keys(data).length)

  if (empty) return (
    <p style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text3)' }}>
      {emptyMessage}
    </p>
  )

  return <>{children}</>
}
