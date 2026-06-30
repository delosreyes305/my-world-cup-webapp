import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { useApi } from '../hooks/useApi'
import { getStandings, getAllFixtures } from '../services/sportsService'
import { sortR32ByBracket, sortR16ByBracket } from '../data/bracketData'
import ApiStatus from '../components/common/ApiStatus'

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
function BracketMatch({ match, navigate }) {
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
      style={{ position: 'relative' }}
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
    // Sort R32 and R16 into official bracket order
    if (buckets.r32) buckets.r32.matches = sortR32ByBracket(buckets.r32.matches)
    if (buckets.r16) buckets.r16.matches = sortR16ByBracket(buckets.r16.matches)
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

          {/* Scrollable horizontal bracket */}
          <div className="bracket-wrap" style={{ alignItems: 'flex-start' }}>
            {knockoutRounds.map(round => {
              // Card + gap dimensions (must match CSS .bracket-match + gap)
              const CARD_H = 82
              const GAP    = 10
              const UNIT   = CARD_H + GAP  // px per R32 row

              // For R16: compute marginTop between consecutive cards using
              // parent row positions so each R16 card sits centered between
              // its two R32 parents.
              //
              // parentRows[i] = [topRow, botRow] (0-indexed R32 positions)
              const parentRows = [
                [1, 4],   // M89 ← M74(row1), M77(row4)
                [0, 2],   // M90 ← M73(row0), M75(row2)
                [3, 5],   // M91 ← M76(row3), M78(row5)
                [6, 7],   // M92 ← M79(row6), M80(row7)
                [10, 11], // M93 ← M83(row10), M84(row11)
                [8, 9],   // M94 ← M81(row8),  M82(row9)
                [13, 15], // M95 ← M86(row13), M88(row15)
                [12, 14], // M96 ← M85(row12), M87(row14)
              ]

              // Compute absolute top for each R16 card (center between parents)
              const r16Tops = parentRows.map(([topRow, botRow]) => {
                const topEdge = topRow * UNIT
                const botEdge = botRow * UNIT + CARD_H
                const r16H    = CARD_H - 8  // R16 cards slightly shorter
                return Math.round(topEdge + (botEdge - topEdge - r16H) / 2)
              })

              return (
                <div key={round.key} className="bracket-round" style={{ minWidth: 190 }}>
                  <div className="bracket-round-title">
                    {ROUND_LABELS[round.key] || round.label}
                    <span style={{ marginLeft: 6, color: 'var(--text3)', fontSize: 9 }}>
                      ({round.matches.length})
                    </span>
                  </div>

                  {round.key === 'r16' ? (
                    // R16: use a relative container with absolute-positioned cards
                    <div style={{ position: 'relative', height: 16 * UNIT }}>
                      {round.matches.map((m, i) => (
                        <div key={m.id} style={{
                          position: 'absolute',
                          top: r16Tops[i] ?? i * UNIT * 2,
                          left: 0, right: 0,
                        }}>
                          <BracketMatch match={m} navigate={navigate} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    round.matches.map(m => (
                      <BracketMatch key={m.id} match={m} navigate={navigate} />
                    ))
                  )}
                </div>
              )
            })}
          </div>
        </ApiStatus>
      )}

    </div>
  )
}