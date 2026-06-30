import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { useApi } from '../hooks/useApi'
import { getStandings, getAllFixtures } from '../services/sportsService'
import ApiStatus from '../components/common/ApiStatus'
import { sortR32ByBracket } from '../data/bracketData'

// ─── Knockout round definitions (order matters) ────────
const KNOCKOUT_ROUNDS = [
  { key: 'r32', label: 'Round of 32',    short: 'R32', test: r => /round.of.32/i.test(r) || r === 'R32'  },
  { key: 'r16', label: 'Round of 16',    short: 'R16', test: r => /round.of.16/i.test(r) || r === 'R16'  },
  { key: 'qf',  label: 'Quarter-finals', short: 'QF',  test: r => /quarter/i.test(r)      || r === 'QF'   },
  { key: 'sf',  label: 'Semi-finals',    short: 'SF',  test: r => /semi/i.test(r)          || r === 'SF'   },
  { key: '3rd', label: '3rd Place',      short: '3rd', test: r => /3rd|third/i.test(r)                    },
  { key: 'f',   label: 'Final',          short: 'Final', test: r => /^final$/i.test(r)     || r === 'F'   },
]

function isGroupStage(round = '') {
  return /group.stage/i.test(round) || /^grp\s/i.test(round) || /^group\s[a-l]$/i.test(round)
}

function classifyKnockout(round = '') {
  if (!round || isGroupStage(round)) return null
  return KNOCKOUT_ROUNDS.find(r => r.test(round)) ?? null
}

// ─── Flag display ──────────────────────────────────────
function Flag({ flag, name, size = 16 }) {
  if (!flag) return null
  if (typeof flag === 'string' && flag.startsWith('http')) {
    return (
      <img src={flag} alt={name || ''}
        style={{ width: size, height: size, objectFit: 'contain', borderRadius: 2, flexShrink: 0 }}
        onError={e => { e.target.style.display = 'none' }}
      />
    )
  }
  return <span style={{ fontSize: size, lineHeight: 1, flexShrink: 0 }} aria-hidden="true">{flag}</span>
}

// ─── Bracket match card ────────────────────────────────
function BracketMatch({ match, navigate, topPx = 0 }) {
  const { id, team1, flag1, team2, flag2, score1, score2, status, time } = match

  const homeName = team1 || 'TBD'
  const awayName = team2 || 'TBD'

  const homeWon = status === 'ft' && score1 > score2
  const awayWon = status === 'ft' && score2 > score1

  const hasScore = score1 !== null && score2 !== null

  return (
    <div
      className="bracket-match"
      onClick={() => id && navigate(`/matches/${id}`, { state: { match } })}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && id && navigate(`/matches/${id}`, { state: { match } })}
      style={{ top: topPx }}
    >
      {/* Home team */}
      <div className={`bracket-team${homeWon ? ' winner' : awayWon ? ' loser' : ''}`}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden' }}>
          <Flag flag={flag1} name={team1} size={13} />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {homeName}
          </span>
        </span>
        <span style={{ fontWeight: homeWon ? 700 : 400, color: homeWon ? 'var(--gold)' : 'inherit', marginLeft: 6, flexShrink: 0 }}>
          {hasScore ? score1 : '—'}
        </span>
      </div>

      {/* Away team */}
      <div className={`bracket-team${awayWon ? ' winner' : homeWon ? ' loser' : ''}`}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden' }}>
          <Flag flag={flag2} name={team2} size={13} />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {awayName}
          </span>
        </span>
        <span style={{ fontWeight: awayWon ? 700 : 400, color: awayWon ? 'var(--gold)' : 'inherit', marginLeft: 6, flexShrink: 0 }}>
          {hasScore ? score2 : '—'}
        </span>
      </div>

      {/* Status pill */}
      <div style={{ marginTop: 5, display: 'flex', justifyContent: 'flex-end' }}>
        {status === 'live' && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: 'var(--red)', fontWeight: 700 }}>
            <span className="live-dot" aria-hidden="true" />{time}
          </span>
        )}
        {status === 'ft' && (
          <span style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600 }}>FT</span>
        )}
        {status === 'upcoming' && time && time !== '' && (
          <span style={{ fontSize: 9, color: 'var(--electric)' }}>{time}</span>
        )}
      </div>
    </div>
  )
}

// ─── Group standings table ─────────────────────────────
function GroupTable({ letter, teams, lang }) {
  if (!teams?.length) return null
  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <h3 className="fw-600 mb-10" style={{ fontSize: 13, color: 'var(--gold)' }}>
        {lang === 'es' ? 'Grupo' : 'Group'} {letter}
      </h3>
      <div className="table-scroll-wrap" style={{ margin: 0, padding: 0 }}>
      <table className="data-table" aria-label={`Group ${letter}`}>
        <thead>
          <tr>
            <th style={{ width: 20 }}>#</th>
            <th>{lang === 'es' ? 'Equipo' : 'Team'}</th>
            <th>MP</th>
            <th className="col-hide-xs">W</th>
            <th className="col-hide-xs">D</th>
            <th className="col-hide-xs">L</th>
            <th>GD</th>
            <th className="text-gold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((t, i) => {
            const gd = t.gf - t.ga
            return (
              <tr key={t.name}>
                <td>
                  <div className={`standing-pos${i < 2 ? ' qualify' : ''}`}>{i + 1}</div>
                </td>
                <td style={{ maxWidth: 130 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Flag flag={t.flag} name={t.name} size={14} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 90 }}>{t.name}</span>
                  </span>
                </td>
                <td>{t.mp}</td>
                <td className="col-hide-xs">{t.w}</td>
                <td className="col-hide-xs">{t.d}</td>
                <td className="col-hide-xs">{t.l}</td>
                <td className={gd > 0 ? 'text-green' : gd < 0 ? 'text-red' : 'text-muted'}>
                  {gd > 0 ? '+' : ''}{gd}
                </td>
                <td className="text-gold fw-600">{t.pts}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────
export default function Bracket() {
  const { t, lang } = useLang()
  const navigate    = useNavigate()

  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('bracket_tab') || 'groups')

  // Group standings — connected to API
  const { data: standings, loading: standLoad, error: standErr, refetch: refetchStand } =
    useApi(getStandings, { ttl: 3_600_000 })

  // All fixtures — used to build knockout bracket
  const { data: fixtures, loading: fixLoad, error: fixErr, refetch: refetchFix } =
    useApi(getAllFixtures, { ttl: 1_800_000, skip: activeTab !== 'knockout' })

  // Build ordered knockout rounds from fixture data
  const knockoutRounds = useMemo(() => {
    if (!fixtures) return []
    const buckets = {}
    fixtures
      .filter(m => !isGroupStage(m.group))
      .forEach(m => {
        const round = classifyKnockout(m.group)
        if (!round) return
        if (!buckets[round.key]) buckets[round.key] = { ...round, matches: [] }
        buckets[round.key].matches.push(m)
      })
    // Sort all rounds by date, R32 by official bracket position
    Object.values(buckets).forEach(b => b.matches.sort((a, z) => new Date(a.date) - new Date(z.date)))
    if (buckets.r32) buckets.r32.matches = sortR32ByBracket(buckets.r32.matches)
    return KNOCKOUT_ROUNDS.filter(r => buckets[r.key]).map(r => buckets[r.key])
  }, [fixtures])

  const groupLetters = Object.keys(standings || {}).sort()

  // Translate knockout round labels
  const ROUND_LABELS = {
    r32: t('bracket','r32'), r16: t('bracket','r16'),
    qf:  t('bracket','qf'),  sf:  t('bracket','sf'),
    '3rd': t('bracket','third'), f: t('bracket','final'),
  }

  const TABS = [
    { key: 'groups',   label: lang === 'es' ? 'Fase de Grupos'    : 'Group Stage'     },
    { key: 'knockout', label: lang === 'es' ? 'Fase Eliminatoria' : 'Knockout Stage'  },
  ]

  return (
    <div className="page-content page-enter">

      {/* ── Header ── */}
      <div className="section-header mb-16">
        <h1 className="section-title"><span>{t('nav', 'bracket')}</span></h1>
        <div className="flex gap-8">
          <span className="badge badge-green">{lang === 'es' ? 'Clasifica' : 'Qualifies'}</span>
          <span className="badge badge-gold">{lang === 'es' ? 'Campeón' : 'Winner'}</span>
        </div>
      </div>

      {/* ── Tab switcher ── */}
      <div className="scroll-tabs mb-20" role="tablist">
        {TABS.map(tab => (
          <button key={tab.key}
            className={`scroll-tab${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => { setActiveTab(tab.key); localStorage.setItem('bracket_tab', tab.key) }}
            role="tab" aria-selected={activeTab === tab.key}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          GROUP STAGE
      ══════════════════════════════════════════ */}
      {activeTab === 'groups' && (
        <ApiStatus
          loading={standLoad}
          error={standErr}
          data={groupLetters.length ? standings : null}
          skeleton="grid"
          skeletonCount={12}
          skeletonHeight={180}
          onRetry={refetchStand}
          emptyMessage={lang === 'es' ? 'Clasificación de grupos no disponible.' : 'Group standings not available yet.'}>

          <div className="grid-4">
            {groupLetters.map(letter => (
              <GroupTable
                key={letter}
                letter={letter}
                teams={(standings || {})[letter]}
                lang={lang}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="card mt-16" style={{ background: 'rgba(240,180,41,0.03)', border: '1px solid rgba(240,180,41,0.1)' }}>
            <div className="flex gap-20 flex-wrap">
              <div className="flex-center gap-8">
                <div className="standing-pos qualify" style={{ width: 22, height: 22, fontSize: 11 }}>1</div>
                <span className="caption">{lang === 'es' ? 'Avanza a siguiente ronda' : 'Advances to next round'}</span>
              </div>
              <div className="flex-center gap-8">
                <div className="standing-pos" style={{ width: 22, height: 22, fontSize: 11 }}>3</div>
                <span className="caption">{lang === 'es' ? 'Eliminado' : 'Eliminated'}</span>
              </div>
            </div>
          </div>
        </ApiStatus>
      )}

      {/* ══════════════════════════════════════════
          KNOCKOUT STAGE
      ══════════════════════════════════════════ */}
      {activeTab === 'knockout' && (
        <ApiStatus
          loading={fixLoad}
          error={fixErr}
          data={knockoutRounds.length ? knockoutRounds : null}
          skeleton="grid"
          skeletonCount={4}
          skeletonHeight={200}
          onRetry={refetchFix}
          emptyMessage={
            <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text3)' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <i className="fa-solid fa-sitemap" style={{ fontSize: 40, opacity: 0.35 }} />
              </div>
              <div className="fw-600" style={{ fontSize: 15, color: 'var(--text2)', marginBottom: 8 }}>
                {lang === 'es' ? 'Fase eliminatoria pendiente' : 'Knockout stage pending'}
              </div>
              <div style={{ fontSize: 13 }}>
                {lang === 'es'
                  ? 'Los cruces se definirán cuando los equipos clasifiquen desde la fase de grupos.'
                  : 'Matchups will be set once teams qualify from the group stage.'}
              </div>
            </div>
          }>

          {/* Scrollable horizontal bracket — slot-based grid
               SLOT = 80px (--bk-slot = --bk-card 72px + --bk-gap 8px)
               R32: 16 slots (one per match), total height = 16 × 80 = 1280px
               R16:  8 slots (each spans 2 R32 slots)
               QF:   4 slots (each spans 2 R16 slots = 4 R32 slots)
               SF:   2 slots (each spans 2 QF slots)
               F:    1 slot  (spans 2 SF slots)

               R32→R16 official mapping (parentRows = [topR32row, botR32row]):
                 M89: rows [1,4]   M90: rows [0,2]
                 M91: rows [3,5]   M92: rows [6,7]
                 M93: rows [10,11] M94: rows [8,9]
                 M95: rows [13,15] M96: rows [12,14]
          */}
          <div className="bracket-wrap">
            {knockoutRounds.map(round => {
              const SLOT = 88   // px — must match CSS :root --bk-slot
              const CARD = 80   // px — must match CSS :root --bk-card

              // How many R32 slots does each card in this round span?
              const slotsPerCard = {
                r32: 1, r16: 2, qf: 4, sf: 8, '3rd': 8, f: 16,
              }[round.key] ?? 1

              const totalSlots = 16  // always based on R32 count
              const slotHeight = totalSlots * SLOT

              // R32 is now sorted in consecutive pairs: 0,1 → R16[0], 2,3 → R16[1], etc.
              const r16ParentRows = Array.from({ length: 8 }, (_, i) => [i * 2, i * 2 + 1])

              // Compute top position for each card in this round
              function cardTop(i) {
                if (round.key === 'r16') {
                  const [topRow, botRow] = r16ParentRows[i] ?? [i * 2, i * 2 + 1]
                  const spanPx = (botRow - topRow) * SLOT + SLOT // total px span
                  const startPx = topRow * SLOT
                  return startPx + (spanPx - CARD) / 2
                }
                // For QF, SF, Final: evenly spaced, each centered in its span
                const spanPx = slotsPerCard * SLOT
                return i * spanPx + (spanPx - CARD) / 2
              }

              return (
                <div key={round.key} className="bracket-round">
                  <div className="bracket-round-title">
                    {ROUND_LABELS[round.key] || round.label}
                  </div>
                  <div className="bracket-slots" style={{ height: slotHeight }}>
                    {round.matches.map((m, i) => (
                      <BracketMatch
                        key={m.id}
                        match={m}
                        navigate={navigate}
                        topPx={cardTop(i)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </ApiStatus>
      )}

    </div>
  )
}