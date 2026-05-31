import React, { useState } from 'react'
import { useLang } from '../context/LangContext'
import { TRIVIA_BANK, FUN_FACTS } from '../data/mockData'

// ── Level configuration ───────────────────────────
const LEVELS = [
  { n: 1, total: 5,  pass: 3  },
  { n: 2, total: 10, pass: 7  },
  { n: 3, total: 15, pass: 15 },
]

// ── Pick N non-repeating questions ───────────────
function pickQuestions(n, usedIds = []) {
  const pool = TRIVIA_BANK.filter(q => !usedIds.includes(q.id))
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(n, shuffled.length))
}

// ── Pick N random items ───────────────────────────
function pickRandom(arr, n) {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n)
}

const FACTS_PER_PAGE = 6

export default function Trivia() {
  const { t, lang } = useLang()

  // Game state
  const [phase, setPhase]             = useState('playing') // 'playing' | 'level_pass' | 'level_fail' | 'champion'
  const [levelIdx, setLevelIdx]       = useState(0)
  const [levelQuestions, setLQ]       = useState(() => pickQuestions(LEVELS[0].total))
  const [qIndex, setQIndex]           = useState(0)
  const [levelCorrect, setLevelCorrect] = useState(0)
  const [answered, setAnswered]       = useState(false)
  const [selected, setSelected]       = useState(null)
  const [usedIds, setUsedIds]         = useState([])

  const [displayedFacts] = useState(() => pickRandom(FUN_FACTS, FACTS_PER_PAGE))

  const cfg      = LEVELS[levelIdx]
  const currentQ = levelQuestions[qIndex]

  // ── Localized question helpers ────────────────────
  const qText    = (q) => (lang === 'es' && q?.q_es)       ? q.q_es       : q?.q
  const qOpts    = (q) => (lang === 'es' && q?.opts_es)    ? q.opts_es    : q?.opts
  const qExplain = (q) => (lang === 'es' && q?.explain_es) ? q.explain_es : q?.explain
  const factText = (f) => (lang === 'es' && f?.fact_es)    ? f.fact_es    : f?.fact

  // ── i18n text ─────────────────────────────────────
  const es = lang === 'es'
  const tx = {
    level:      es ? 'Nivel'     : 'Level',
    question:   es ? 'Pregunta'  : 'Question',
    of:         es ? 'de'        : 'of',
    corrects:   es ? 'Correctas' : 'Correct',
    need:       es ? 'Necesitas' : 'Need',
    hint:       es ? 'Pista:'    : 'Hint:',
    correct:    es ? '¡Correcto!' : 'Correct!',
    incorrect:  es ? 'Incorrecto' : 'Incorrect',
    next:       es ? 'Siguiente →' : 'Next →',
    seeResult:  es ? 'Ver resultado del nivel →' : 'See level result →',
    levelDesc:  es
      ? ['3/5 correctas para avanzar', '7/10 correctas para avanzar', '15/15 para ser campeón']
      : ['3/5 correct to advance',     '7/10 correct to advance',     '15/15 to become champion'],
    // Pass screen
    passTitle:  (n) => es ? `¡Nivel ${n} Superado!`           : `Level ${n} Passed!`,
    passMsg:    (n) => es ? `¡Avanzas al Nivel ${n}!`          : `Advancing to Level ${n}!`,
    passBtn:    es ? 'Continuar al siguiente nivel →'          : 'Continue to next level →',
    // Fail screen
    failTitle:  es ? '¡Has perdido!' : 'You Lost!',
    failMsg:    (c, total, p) => es
      ? `Obtuviste ${c} de ${total} correctas, pero necesitabas ${p}. ¡Inténtalo de nuevo!`
      : `You scored ${c} out of ${total}, but needed ${p}. Try again!`,
    failBtn:    es ? 'Intentarlo de nuevo' : 'Try Again',
    // Champion screen
    champTitle: es ? '¡Campeón de Trivia Mundialista!' : 'World Cup Trivia Champion!',
    champMsg:   es
      ? '¡Respondiste 15/15 correctas! Eres un verdadero maestro del fútbol mundial.'
      : 'You scored 15/15! You are a true master of world football.',
    champBtn:   es ? 'Jugar de nuevo' : 'Play Again',
    champLevels:es ? 'Niveles completados' : 'Levels completed',
    // Misc
    cantPass:   es
      ? 'Ya no es posible alcanzar el mínimo requerido en este nivel.'
      : "It's no longer possible to reach the minimum for this level.",
    funFacts:   t('trivia', 'fun_facts'),
  }

  // ── Game logic ────────────────────────────────────
  function answer(idx) {
    if (answered) return
    setSelected(idx)
    setAnswered(true)
    if (idx === currentQ.correct) setLevelCorrect(c => c + 1)
  }

  function nextQuestion() {
    const nextIdx = qIndex + 1
    if (nextIdx >= cfg.total) {
      // End of level — levelCorrect already reflects all answers including current
      if (levelCorrect >= cfg.pass) {
        setPhase(levelIdx === LEVELS.length - 1 ? 'champion' : 'level_pass')
      } else {
        setPhase('level_fail')
      }
    } else {
      setQIndex(nextIdx)
      setAnswered(false)
      setSelected(null)
    }
  }

  function advanceLevel() {
    const next      = levelIdx + 1
    const nowUsed   = [...usedIds, ...levelQuestions.map(q => q.id)]
    setUsedIds(nowUsed)
    setLevelIdx(next)
    setLQ(pickQuestions(LEVELS[next].total, nowUsed))
    setQIndex(0)
    setLevelCorrect(0)
    setAnswered(false)
    setSelected(null)
    setPhase('playing')
  }

  function restart() {
    setPhase('playing')
    setLevelIdx(0)
    setLQ(pickQuestions(LEVELS[0].total))
    setQIndex(0)
    setLevelCorrect(0)
    setAnswered(false)
    setSelected(null)
    setUsedIds([])
  }

  // ── CHAMPION SCREEN ───────────────────────────────
  if (phase === 'champion') {
    return (
      <div className="page-content page-enter">
        <div className="trivia-result-screen trivia-champion-screen">
          <div className="trivia-result-icon trivia-champion-icon" aria-hidden="true">🏆</div>
          <div className="trivia-champion-stars" aria-hidden="true">
            <span>⭐</span><span>⭐</span><span>⭐</span>
          </div>
          <h1 className="trivia-champion-title">{tx.champTitle}</h1>
          <p className="trivia-result-msg">{tx.champMsg}</p>

          <div className="trivia-champion-levels">
            {LEVELS.map((l, i) => (
              <div key={i} className="trivia-champion-level-badge">
                <span aria-hidden="true">{['🥉','🥈','🥇'][i]}</span>
                <span className="trivia-clb-label">{tx.level} {l.n}</span>
                <span className="trivia-clb-check">✓</span>
              </div>
            ))}
          </div>

          <button className="btn btn-gold trivia-result-btn" onClick={restart}>
            🎲 {tx.champBtn}
          </button>
        </div>

        <div className="divider" />
        <FunFactsSection facts={displayedFacts} heading={tx.funFacts} total={FUN_FACTS.length} factText={factText} />
      </div>
    )
  }

  // ── LEVEL PASS SCREEN ─────────────────────────────
  if (phase === 'level_pass') {
    return (
      <div className="page-content page-enter">
        <div className="trivia-result-screen trivia-pass-screen">
          <div className="trivia-result-icon trivia-bounce-icon" aria-hidden="true">🎉</div>
          <h2 className="trivia-pass-title">{tx.passTitle(cfg.n)}</h2>
          <p className="trivia-result-msg">{tx.passMsg(cfg.n + 1)}</p>
          <div className="trivia-score-pill trivia-score-green">
            ✅ {levelCorrect}/{cfg.total} {tx.corrects}
          </div>
          <button className="btn btn-gold trivia-result-btn" onClick={advanceLevel}>
            {tx.passBtn}
          </button>
        </div>
      </div>
    )
  }

  // ── LEVEL FAIL SCREEN ─────────────────────────────
  if (phase === 'level_fail') {
    return (
      <div className="page-content page-enter">
        <div className="trivia-result-screen trivia-fail-screen">
          <div className="trivia-result-icon trivia-shake-icon" aria-hidden="true">❌</div>
          <h2 className="trivia-fail-title">{tx.failTitle}</h2>
          <p className="trivia-result-msg">{tx.failMsg(levelCorrect, cfg.total, cfg.pass)}</p>
          <button className="btn btn-gold trivia-result-btn" onClick={restart}>
            {tx.failBtn}
          </button>
        </div>
      </div>
    )
  }

  // ── PLAYING SCREEN ────────────────────────────────
  const progressPct    = ((qIndex + (answered ? 1 : 0)) / cfg.total) * 100
  const passNeeds      = cfg.pass - levelCorrect
  const questionsLeft  = cfg.total - qIndex - (answered ? 1 : 0)
  const canStillPass   = passNeeds <= questionsLeft
  const isLastQuestion = qIndex + 1 >= cfg.total

  return (
    <div className="page-content page-enter">

      {/* Header */}
      <div className="section-header mb-16">
        <h1 className="section-title"><span>{t('trivia', 'title')}</span></h1>
      </div>

      {/* Level indicator tabs */}
      <div className="trivia-level-tabs">
        {LEVELS.map((l, i) => (
          <div
            key={i}
            className={`trivia-level-tab${i === levelIdx ? ' active' : ''}${i > levelIdx ? ' locked' : ''}`}
          >
            <span className="trivia-level-tab-n">{tx.level} {l.n}</span>
            <span className="trivia-level-tab-desc">{tx.levelDesc[i]}</span>
          </div>
        ))}
      </div>

      {/* Progress bar card */}
      <div className="card mb-16 trivia-progress-card">
        <div className="flex-between mb-8">
          <span className="trivia-prog-label">
            {tx.question} <strong>{qIndex + 1}</strong> {tx.of} <strong>{cfg.total}</strong>
          </span>
          <span className="trivia-prog-score">
            {tx.corrects}: <strong style={{ color: 'var(--gold)' }}>{levelCorrect}</strong>
            <span className="trivia-prog-need"> / {tx.need} {cfg.pass}</span>
          </span>
        </div>
        <div className="stat-bar-track">
          <div className="stat-bar-fill" style={{ width: `${progressPct}%`, transition: 'width 0.4s ease' }} />
        </div>
      </div>

      {/* Question card */}
      {currentQ && (
        <div className="card mb-16 trivia-question-card">
          <h2 className="trivia-question-text">{qText(currentQ)}</h2>
          <div className="trivia-options-grid" role="group" aria-label="Answer options">
            {qOpts(currentQ).map((opt, i) => {
              let cls = 'trivia-opt'
              if (answered) {
                if (i === currentQ.correct)                        cls += ' correct'
                else if (i === selected && i !== currentQ.correct) cls += ' wrong'
                else                                               cls += ' disabled'
              }
              return (
                <button
                  key={i}
                  className={cls}
                  onClick={() => answer(i)}
                  disabled={answered}
                  aria-label={`${['A','B','C','D'][i]}: ${opt}`}
                >
                  <span className="trivia-opt-letter">{['A','B','C','D'][i]}.</span>
                  {opt}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Answer feedback */}
      {answered && (
        <div className="card mb-24 animate-fade">
          <div
            className={`trivia-feedback ${selected === currentQ?.correct ? 'trivia-feedback-correct' : 'trivia-feedback-wrong'}`}
            role="alert"
            aria-live="polite"
          >
            <div className="trivia-feedback-verdict">
              {selected === currentQ?.correct ? `✅ ${tx.correct}` : `❌ ${tx.incorrect}`}
            </div>
            <div className="trivia-feedback-explain">
              💡 {tx.hint} {qExplain(currentQ)}
            </div>
          </div>

          {!canStillPass && !isLastQuestion && (
            <div className="trivia-cant-pass">
              ⚠️ {tx.cantPass}
            </div>
          )}

          <button className="btn btn-gold" onClick={nextQuestion}>
            {isLastQuestion ? tx.seeResult : tx.next}
          </button>
        </div>
      )}

      <div className="divider" />

      {/* Fun facts */}
      <FunFactsSection facts={displayedFacts} heading={tx.funFacts} total={FUN_FACTS.length} factText={factText} />
    </div>
  )
}

// ── Fun facts sub-component ───────────────────────
function FunFactsSection({ facts, heading, total, factText }) {
  const getText = factText || ((f) => f.fact)
  return (
    <section aria-labelledby="facts-heading">
      <div className="section-header mb-16">
        <h2 className="section-title" id="facts-heading"><span>{heading}</span></h2>
        {total != null && (
          <span className="caption" style={{ color: 'var(--text3)' }}>
            {facts.length}/{total}
          </span>
        )}
      </div>
      <div className="grid-2">
        {facts.map((f, i) => (
          <div key={i} className="card-sm flex gap-12" style={{ alignItems: 'flex-start' }}>
            <span style={{ fontSize: 28, flexShrink: 0 }} aria-hidden="true">{f.emoji}</span>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text2)' }}>{getText(f)}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
