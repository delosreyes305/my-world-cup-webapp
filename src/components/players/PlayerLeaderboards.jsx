import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../../context/LangContext'
import { useApi } from '../../hooks/useApi'
import {
  getTopScorers, getTopAssists, getTopYellowCards, getTopRedCards, getInjuries,
  TEAM_ISO,
} from '../../services/sportsService'
import ApiStatus from '../common/ApiStatus'

const COLLAPSED_COUNT = 10

function Flag({ nation }) {
  const iso = TEAM_ISO[nation]
  if (!iso) return null
  return (
    <img src={`https://flagcdn.com/w20/${iso}.png`} alt={nation}
      style={{ width: 14, height: 10, objectFit: 'cover', borderRadius: 1, border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}
      onError={e => { e.target.style.display = 'none' }}
    />
  )
}

function PlayerStatRow({ player: p, rank, statKey, color, labelShort, maxVal, onClick }) {
  const statVal = p[statKey] ?? 0
  const pct     = Math.round((statVal / maxVal) * 100)
  const isFirst = rank === 1
  return (
    <button className="card-clickable" onClick={onClick}
      style={{
        width: '100%', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
        background: isFirst ? `${color}0f` : 'transparent',
        borderLeft: `3px solid ${isFirst ? color : 'transparent'}`,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
      <div style={{
        width: 28, height: 28, borderRadius: 6, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
        background: isFirst ? color : 'rgba(255,255,255,0.06)',
        color: isFirst ? 'var(--navy)' : 'var(--text3)',
      }}>{rank}</div>
      <div style={{
        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
        background: 'rgba(255,255,255,0.06)',
        border: `1.5px solid ${isFirst ? color + '66' : 'rgba(255,255,255,0.08)'}`,
        overflow: 'hidden', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {p.photo ? <img src={p.photo} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} /> : '⭐'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
          <span className="fw-600" style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text)' }}>{p.name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
          <Flag nation={p.nation} />
          <span className="caption" style={{ fontSize: 10, color: 'var(--text3)' }}>{[p.pos, p.nation].filter(Boolean).join(' · ')}</span>
        </div>
        <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2 }}>
          <div style={{ width: `${pct || 3}%`, height: '100%', borderRadius: 2, background: isFirst ? color : `${color}55` }} />
        </div>
      </div>
      <div style={{ textAlign: 'center', flexShrink: 0, minWidth: 36 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color, lineHeight: 1 }}>{statVal}</div>
        <div className="caption" style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{labelShort}</div>
      </div>
    </button>
  )
}

function InjuryRow({ injury: inj, t, lang }) {
  const typeLabel = (() => {
    const ty = (inj.type || '').toLowerCase()
    if (ty.includes('question')) return t('stats', 'questionable')
    if (ty.includes('doubt'))    return t('stats', 'doubtful')
    return t('stats', 'out')
  })()
  const dateLabel = inj.date
    ? new Date(inj.date).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { day: '2-digit', month: 'short' })
    : ''
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.08)', overflow: 'hidden', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {inj.photo ? <img src={inj.photo} alt={inj.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} /> : '🩺'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="fw-600" style={{ fontSize: 13, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text)' }}>{inj.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Flag nation={inj.nation} />
          <span className="caption" style={{ fontSize: 10, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{[inj.nation, inj.reason].filter(Boolean).join(' · ')}</span>
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div className="caption" style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.12)', color: 'var(--red)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{typeLabel}</div>
        {dateLabel && <div className="caption" style={{ fontSize: 9, color: 'var(--text3)' }}>{dateLabel}</div>}
      </div>
    </div>
  )
}

function LeaderboardCard({ icon, title, color, loading, error, list, statKey, labelShort, emptyMessage, t, lang, navigate }) {
  const [expanded, setExpanded] = useState(false)
  const isInjury = statKey === null
  const maxVal = useMemo(() => {
    if (isInjury || !list?.length) return 1
    return Math.max(list[0]?.[statKey] || 0, 1)
  }, [list, statKey, isInjury])
  const visible = expanded ? (list || []) : (list || []).slice(0, COLLAPSED_COUNT)
  const hasMore = (list || []).length > COLLAPSED_COUNT
  return (
    <div className="mb-24">
      <div className="section-header" style={{ marginBottom: 8 }}>
        <h2 className="section-title" style={{ fontSize: 16 }}>
          <i className={icon} aria-hidden="true" style={{ color, marginRight: 8 }} />
          <span>{title}</span>
        </h2>
        {hasMore && (
          <button className="see-all" onClick={() => setExpanded(e => !e)}>
            {expanded ? (lang === 'es' ? 'Ver menos' : 'Show less') : `${lang === 'es' ? 'Ver todo' : 'See all'} (${list.length})`} {expanded ? '↑' : '→'}
          </button>
        )}
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <ApiStatus loading={loading} error={error} data={list?.length ? list : null} skeleton="list" skeletonCount={5} skeletonHeight={64} emptyMessage={emptyMessage}>
          {isInjury
            ? visible.map(inj => <InjuryRow key={inj.id} injury={inj} t={t} lang={lang} />)
            : visible.map((p, i) => (
                <PlayerStatRow key={p.id} player={p} rank={i + 1} statKey={statKey} color={color} labelShort={labelShort} maxVal={maxVal}
                  onClick={() => navigate(`/players/${p.id}`, { state: { player: p } })} />
              ))
          }
        </ApiStatus>
      </div>
    </div>
  )
}

export default function PlayerLeaderboards() {
  const { t, lang } = useLang()
  const navigate    = useNavigate()
  const { data: scorers,   loading: loadGoals,    error: errGoals    } = useApi(getTopScorers,     null, { ttl: 3_600_000 })
  const { data: assisters, loading: loadAssists,  error: errAssists  } = useApi(getTopAssists,     null, { ttl: 3_600_000 })
  const { data: yellows,   loading: loadYellows,  error: errYellows  } = useApi(getTopYellowCards, null, { ttl: 3_600_000 })
  const { data: reds,      loading: loadReds,     error: errReds     } = useApi(getTopRedCards,    null, { ttl: 3_600_000 })
  const { data: injuries,  loading: loadInjuries, error: errInjuries } = useApi(getInjuries,       null, { ttl: 1_800_000 })
  const shared = { t, lang, navigate }
  return (
    <div>
      <LeaderboardCard {...shared} icon="fa-solid fa-futbol" title={t('stats','goals')} color="var(--gold)" loading={loadGoals} error={errGoals} list={scorers} statKey="goals" labelShort={lang==='es'?'G':'G'} emptyMessage={t('stats','no_data')} />
      <LeaderboardCard {...shared} icon="fa-solid fa-shoe-prints" title={t('stats','assists')} color="var(--electric)" loading={loadAssists} error={errAssists} list={assisters} statKey="assists" labelShort={lang==='es'?'A':'A'} emptyMessage={t('stats','no_data')} />
      <LeaderboardCard {...shared} icon="fa-solid fa-square" title={t('stats','yellow')} color="#f0b429" loading={loadYellows} error={errYellows} list={yellows} statKey="yellowCards" labelShort={lang==='es'?'TA':'YC'} emptyMessage={t('stats','no_data')} />
      <LeaderboardCard {...shared} icon="fa-solid fa-square" title={t('stats','red')} color="var(--red)" loading={loadReds} error={errReds} list={reds} statKey="redCards" labelShort={lang==='es'?'TR':'RC'} emptyMessage={t('stats','no_data')} />
      <LeaderboardCard {...shared} icon="fa-solid fa-kit-medical" title={t('stats','injuries')} color="var(--red)" loading={loadInjuries} error={errInjuries} list={injuries} statKey={null} labelShort="" emptyMessage={t('stats','no_injuries')} />
    </div>
  )
}
