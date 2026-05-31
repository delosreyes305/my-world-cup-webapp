import React, { useState, useMemo } from 'react'
import { useLang } from '../context/LangContext'
import { useApi, useApiPolling } from '../hooks/useApi'
import { getLiveMatches, getMatchesByDate, getAllFixtures } from '../services/sportsService'
import MatchCard from '../components/common/MatchCard'
import ApiStatus from '../components/common/ApiStatus'
import '../components/common/MatchCard.css'

// ─── Date helpers (local-timezone safe) ───────────────
function todayStr() {
  const d = new Date()
  const y  = d.getFullYear()
  const m  = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function addDays(dateStr, n) {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, mo - 1, d + n)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${day}`
}

function formatDateNav(dateStr, lang) {
  const today     = todayStr()
  const yesterday = addDays(today, -1)
  const tomorrow  = addDays(today, +1)
  if (dateStr === today)     return lang === 'es' ? 'Hoy'    : 'Today'
  if (dateStr === yesterday) return lang === 'es' ? 'Ayer'   : 'Yesterday'
  if (dateStr === tomorrow)  return lang === 'es' ? 'Mañana' : 'Tomorrow'
  const [y, mo, d] = dateStr.split('-').map(Number)
  return new Date(y, mo - 1, d).toLocaleDateString(
    lang === 'es' ? 'es-US' : 'en-US',
    { weekday: 'short', month: 'short', day: 'numeric' }
  )
}

function formatGroupHeader(dateStr, lang) {
  if (!dateStr || dateStr === 'TBD') return 'TBD'
  const today    = todayStr()
  const tomorrow = addDays(today, +1)
  if (dateStr === today)    return lang === 'es' ? 'Hoy'    : 'Today'
  if (dateStr === tomorrow) return lang === 'es' ? 'Mañana' : 'Tomorrow'
  const [y, mo, d] = dateStr.split('-').map(Number)
  return new Date(y, mo - 1, d).toLocaleDateString(
    lang === 'es' ? 'es-US' : 'en-US',
    { weekday: 'long', month: 'long', day: 'numeric' }
  )
}

// Groups an array of matches by their date (YYYY-MM-DD key)
function groupByDate(matches, ascending = true) {
  const map = {}
  matches.forEach(m => {
    const key = m.date ? m.date.split('T')[0] : 'TBD'
    if (!map[key]) map[key] = []
    map[key].push(m)
  })
  const entries = Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  return ascending ? entries : entries.reverse()
}

// ─── Tiny section label ────────────────────────────────
function SectionLabel({ children, color = 'var(--text3)' }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '0.8px',
      textTransform: 'uppercase', color,
      marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6,
    }}>
      {children}
    </p>
  )
}

// ─── Date group header ─────────────────────────────────
function DateHeader({ dateStr, lang }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      marginBottom: 12, marginTop: 4,
    }}>
      <div style={{
        fontSize: 13, fontWeight: 700, color: 'var(--text2)',
      }}>
        {formatGroupHeader(dateStr, lang)}
      </div>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
      {dateStr !== 'TBD' && (
        <div className="caption" style={{ fontSize: 10, color: 'var(--text3)', flexShrink: 0 }}>
          {dateStr}
        </div>
      )}
    </div>
  )
}

// ─── Main component ────────────────────────────────────
export default function Matches() {
  const { t, lang } = useLang()

  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [statusFilter, setStatusFilter] = useState('All')

  const isToday        = selectedDate === todayStr()
  const showDateNav    = statusFilter === 'All'
  const needAllFixtures = statusFilter === 'Upcoming' || statusFilter === 'Completed'

  // ── Live: always polling ──────────────────────────────
  const { data: liveData, refetch: refetchLive } =
    useApiPolling(getLiveMatches, 30_000)

  // ── Day view (only used for "All" tab) ────────────────
  const { data: dateData, loading: dateLoading, error: dateError, refetch: refetchDate } =
    useApi(getMatchesByDate, selectedDate, {
      ttl: isToday ? 60_000 : 300_000,
      skip: !showDateNav,
    })

  // ── All fixtures (used for Upcoming / Completed tabs) ─
  const { data: allFixtures, loading: allLoading, error: allError, refetch: refetchAll } =
    useApi(getAllFixtures, { ttl: 1_800_000, skip: !needAllFixtures })

  // ── Derived display data ──────────────────────────────
  const displayMatches = useMemo(() => {
    if (statusFilter === 'Live') {
      return liveData || []
    }

    if (statusFilter === 'Upcoming') {
      return (allFixtures || []).filter(m => m.status === 'upcoming')
    }

    if (statusFilter === 'Completed') {
      return (allFixtures || []).filter(m => m.status === 'ft')
    }

    // 'All': merge live + today's date feed
    const liveIds = new Set((liveData || []).map(m => m.id))
    const byDate  = (dateData || []).map(m =>
      liveIds.has(m.id) ? { ...m, status: 'live' } : m
    )
    if (isToday && liveData?.length) {
      const dateIds   = new Set(byDate.map(m => m.id))
      const extraLive = liveData.filter(m => !dateIds.has(m.id))
      return [...byDate, ...extraLive]
    }
    return byDate
  }, [statusFilter, liveData, dateData, allFixtures, isToday])

  const liveCount = (liveData || []).length
  const loading   = statusFilter === 'All' ? dateLoading : (needAllFixtures ? allLoading : false)
  const error     = statusFilter === 'All' ? dateError   : (needAllFixtures ? allError   : null)

  const onRetry = () => {
    refetchLive()
    if (statusFilter === 'All')      refetchDate()
    if (needAllFixtures)             refetchAll()
  }

  // ── Status filter tabs ────────────────────────────────
  const STATUS_FILTERS = [
    {
      key: 'All',
      label: lang === 'es' ? 'Todos' : 'All',
    },
    {
      key: 'Live',
      label: liveCount > 0
        ? `${lang === 'es' ? 'En vivo' : 'Live'} (${liveCount})`
        : (lang === 'es' ? 'En vivo' : 'Live'),
    },
    {
      key: 'Upcoming',
      label: lang === 'es' ? 'Próximos' : 'Upcoming',
    },
    {
      key: 'Completed',
      label: lang === 'es' ? 'Finalizados' : 'Completed',
    },
  ]

  // ── Grouped views for Upcoming / Completed ─────────────
  const groupedUpcoming  = useMemo(() =>
    statusFilter === 'Upcoming'  ? groupByDate(displayMatches, true)  : [],
  [statusFilter, displayMatches])

  const groupedCompleted = useMemo(() =>
    statusFilter === 'Completed' ? groupByDate(displayMatches, false) : [],
  [statusFilter, displayMatches])

  // For 'All': split by status
  const live     = displayMatches.filter(m => m.status === 'live')
  const upcoming = displayMatches.filter(m => m.status === 'upcoming')
  const ft       = displayMatches.filter(m => m.status === 'ft')

  // ── Empty message per tab ─────────────────────────────
  const emptyMessage = {
    All:       lang === 'es' ? 'No hay partidos para este día.'    : 'No matches scheduled for this day.',
    Live:      lang === 'es' ? 'No hay partidos en vivo ahora.'    : 'No live matches right now.',
    Upcoming:  lang === 'es' ? 'No hay próximos partidos.'         : 'No upcoming matches found.',
    Completed: lang === 'es' ? 'No hay partidos finalizados aún.'  : 'No completed matches yet.',
  }[statusFilter]

  return (
    <div className="page-content page-enter">

      {/* ── Page header ── */}
      <div className="section-header mb-16">
        <h1 className="section-title"><span>{t('nav', 'matches')}</span></h1>
        {liveCount > 0 && (
          <div className="flex-center gap-6">
            <span className="live-dot" aria-hidden="true" />
            <span style={{ fontSize: 12, color: 'var(--red)', fontWeight: 700 }}>
              {liveCount} {lang === 'es' ? 'en vivo' : 'live'}
            </span>
          </div>
        )}
      </div>

      {/* ── Date nav (only when "All" tab is active) ── */}
      {showDateNav && (
        <div className="card mb-16" style={{ padding: '10px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

            <button className="btn btn-ghost btn-sm"
              onClick={() => setSelectedDate(d => addDays(d, -1))}
              aria-label={lang === 'es' ? 'Día anterior' : 'Previous day'}>
              ←
            </button>

            <div style={{ textAlign: 'center', flex: 1 }}>
              <div className="fw-600" style={{
                fontSize: 14,
                color: isToday ? 'var(--gold)' : 'var(--text)',
              }}>
                {formatDateNav(selectedDate, lang)}
              </div>
              <div className="caption" style={{ fontSize: 10 }}>{selectedDate}</div>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              {!isToday && (
                <button className="btn btn-outline btn-sm"
                  onClick={() => setSelectedDate(todayStr())}>
                  {lang === 'es' ? 'Hoy' : 'Today'}
                </button>
              )}
              <button className="btn btn-ghost btn-sm"
                onClick={() => setSelectedDate(d => addDays(d, +1))}
                aria-label={lang === 'es' ? 'Día siguiente' : 'Next day'}>
                →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Status filter tabs ── */}
      <div className="scroll-tabs" role="tablist"
        aria-label={lang === 'es' ? 'Filtro de estado' : 'Status filter'}>
        {STATUS_FILTERS.map(f => (
          <button key={f.key}
            className={`scroll-tab${statusFilter === f.key ? ' active' : ''}`}
            onClick={() => setStatusFilter(f.key)}
            role="tab" aria-selected={statusFilter === f.key}>
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Match content ── */}
      <ApiStatus
        loading={loading}
        error={error}
        data={displayMatches.length ? displayMatches : null}
        skeleton="grid"
        skeletonCount={6}
        skeletonHeight={145}
        onRetry={onRetry}
        emptyMessage={emptyMessage}>

        {/* ─── ALL: grouped by status, respect selected date ─── */}
        {statusFilter === 'All' && (
          <>
            {live.length > 0 && (
              <section className="mb-24">
                <SectionLabel color="var(--red)">
                  <span className="live-dot" aria-hidden="true" />
                  {lang === 'es' ? 'En vivo' : 'Live now'}
                  <span style={{ color: 'var(--text3)', fontWeight: 400 }}>
                    · {lang === 'es' ? 'actualiza cada 30s' : 'updates every 30s'}
                  </span>
                </SectionLabel>
                <div className="grid-2">
                  {live.map(m => <MatchCard key={m.id} match={m} />)}
                </div>
              </section>
            )}

            {upcoming.length > 0 && (
              <section className="mb-24">
                <SectionLabel color="var(--electric)">
                  {lang === 'es' ? 'Próximos' : 'Upcoming'}
                </SectionLabel>
                <div className="grid-2">
                  {upcoming.map(m => <MatchCard key={m.id} match={m} />)}
                </div>
              </section>
            )}

            {ft.length > 0 && (
              <section className="mb-8">
                <SectionLabel>
                  {lang === 'es' ? 'Finalizados' : 'Completed'}
                </SectionLabel>
                <div className="grid-2">
                  {ft.map(m => <MatchCard key={m.id} match={m} />)}
                </div>
              </section>
            )}
          </>
        )}

        {/* ─── LIVE: all live matches right now ─── */}
        {statusFilter === 'Live' && (
          <section>
            {liveCount > 0 && (
              <SectionLabel color="var(--red)">
                <span className="live-dot" aria-hidden="true" />
                {lang === 'es' ? 'En vivo' : 'Live now'}
                <span style={{ color: 'var(--text3)', fontWeight: 400 }}>
                  · {lang === 'es' ? 'actualiza cada 30s' : 'updates every 30s'}
                </span>
              </SectionLabel>
            )}
            <div className="grid-2">
              {displayMatches.map(m => <MatchCard key={m.id} match={m} />)}
            </div>
          </section>
        )}

        {/* ─── UPCOMING: all future matches grouped by date ─── */}
        {statusFilter === 'Upcoming' && (
          <section>
            {groupedUpcoming.map(([dateKey, matches]) => (
              <div key={dateKey} className="mb-24">
                <DateHeader dateStr={dateKey} lang={lang} />
                <div className="grid-2">
                  {matches.map(m => <MatchCard key={m.id} match={m} />)}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* ─── COMPLETED: all finished matches grouped by date ─── */}
        {statusFilter === 'Completed' && (
          <section>
            {groupedCompleted.map(([dateKey, matches]) => (
              <div key={dateKey} className="mb-24">
                <DateHeader dateStr={dateKey} lang={lang} />
                <div className="grid-2">
                  {matches.map(m => <MatchCard key={m.id} match={m} />)}
                </div>
              </div>
            ))}
          </section>
        )}

      </ApiStatus>
    </div>
  )
}
