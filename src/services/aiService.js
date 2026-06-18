// ─── AI Service — calls /api/claude proxy ──────────────
// Dev:  Vite middleware in vite.config.js handles /api/claude
// Prod: Vercel serverless function api/claude.js handles it
// The ANTHROPIC_API_KEY is NEVER in the browser bundle.

// AI calls need a longer timeout than other API calls (Claude can take 15-20s)
const AI_TIMEOUT_MS = 25000

async function callClaude({ prompt, system, max_tokens = 650, temperature }) {
  const body = { prompt, max_tokens }
  if (system) body.system = system
  if (temperature != null) body.temperature = temperature

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)

  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    clearTimeout(timer)
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    return data.content?.find(c => c.type === 'text')?.text || ''
  } catch (err) {
    clearTimeout(timer)
    if (err.name === 'AbortError') throw new Error('AI request timed out. Please try again.')
    throw err
  }
}

// ─────────────────────────────────────────────────────────
// MATCH PREDICTION
// Returns: { score, winner, confidence, team1_strengths,
//            team2_strengths, key_player_1, key_player_2,
//            tactics, analysis, _isMock? }
// Throws on API key / network errors so the UI can show them.
// ─────────────────────────────────────────────────────────

function mockPrediction(team1, team2) {
  const favoured = (team1.rank || 99) <= (team2.rank || 99) ? team1 : team2
  const underdog  = favoured.id === team1.id ? team2 : team1

  // Pick a varied, semi-random scoreline so it's not always 2-1
  const SCORELINES = [
    [1, 0], [2, 0], [2, 1], [3, 1], [1, 1], [3, 2], [4, 1], [0, 0], [2, 2],
  ]
  const [hi, lo] = SCORELINES[Math.floor(Math.random() * SCORELINES.length)]
  const isDraw   = hi === lo
  const score    = isDraw
    ? `${favoured.name} ${hi}-${lo} ${underdog.name}`
    : `${favoured.name} ${hi}-${lo} ${underdog.name}`

  return {
    _isMock: true,
    score,
    winner:  isDraw ? 'Draw' : favoured.name,
    confidence: isDraw ? 50 : 60 + Math.floor(Math.random() * 20),
    team1_strengths: ['Experienced squad', 'Strong defensive block', 'Set-piece quality'],
    team2_strengths: ['Pace on the counter', 'High pressing system', 'Technical midfield'],
    key_player_1: `${team1.name} Captain`,
    key_player_2: `${team2.name} Captain`,
    tactics:  `${team1.name} will look to control the tempo with a 4-2-3-1, while ${team2.name} is likely to sit compactly in a 4-4-2 and exploit transitions.`,
    analysis: `${team1.name} (FIFA #${team1.rank || '—'}) arrive with a strong historical record at World Cups. ${team2.name} (FIFA #${team2.rank || '—'}) have shown great resilience throughout the tournament. This should be a tightly contested match where fine margins decide the outcome.`,
  }
}

export async function getMatchPredictionAI(team1, team2, lang = 'en') {
  const isEs = lang === 'es'

  const system = isEs
    ? 'Eres un experto analista de la Copa del Mundo FIFA 2026. Siempre respondes en español con entusiasmo y precisión táctica.'
    : 'You are a passionate FIFA World Cup 2026 expert analyst. Always respond in English with tactical precision and excitement.'

  const t1info = `${team1.flag || ''} ${team1.name}: FIFA #${team1.rank || '?'}, form: ${team1.form?.join('-') || 'N/A'}, WC titles: ${team1.titles || 0}, coach: ${team1.coach || 'TBD'}`
  const t2info = `${team2.flag || ''} ${team2.name}: FIFA #${team2.rank || '?'}, form: ${team2.form?.join('-') || 'N/A'}, WC titles: ${team2.titles || 0}, coach: ${team2.coach || 'TBD'}`

  // Random seed + explicit dice rolls force genuine variation instead of the
  // model collapsing onto the single most statistically common scoreline.
  const seed   = Math.floor(Math.random() * 1_000_000)
  const dice1  = (Math.random() * 6).toFixed(2)
  const dice2  = (Math.random() * 6).toFixed(2)

  const prompt = isEs
    ? `Eres un motor estadístico de simulación de fútbol (no un narrador). Tu única fuente de verdad para el marcador son los cálculos numéricos que vas a hacer ahora, NO un patrón típico de fútbol ni un marcador "común".

${t1info}
${t2info}

Números aleatorios para esta simulación (úsalos como semillas de tu cálculo, ignóralos en el texto final): seed=${seed}, roll1=${dice1}, roll2=${dice2}

CÁLCULO OBLIGATORIO (muestra tu razonamiento en el campo "tactics" de forma breve, ej: "Goles esperados: ${team1.name} 2.3 — ${team2.name} 0.8"):
1. Calcula goles esperados (xG) de ${team1.name} como un decimal entre 0.0 y 4.0, basado en su ranking FIFA, forma reciente y nivel del rival. Usa roll1 para variar el resultado dentro del rango plausible.
2. Calcula goles esperados (xG) de ${team2.name} de la misma forma usando roll2.
3. Redondea cada xG al entero más cercano (con redondeo normal, no siempre hacia arriba ni hacia abajo) para obtener los goles finales de cada equipo. Estos dos números, tal cual salgan del cálculo, SON el marcador final — no los ajustes ni los sustituyas por un resultado "típico".
4. NO existe ningún marcador prohibido ni ningún marcador obligatorio. 0-0, 5-0, 1-4, 3-3, cualquier combinación es válida si así lo indica tu cálculo de xG. Confía en el número que calculaste, no en lo que "suene más realista" de memoria.

Responde ÚNICAMENTE con JSON válido (sin texto extra ni markdown). NO copies los números de ejemplo de abajo — son solo para mostrar el formato del JSON, tus valores reales deben venir de tu cálculo:
{
  "score": "${team1.name} <goles1>-<goles2> ${team2.name}",
  "winner": "nombre del equipo con más goles, o Draw/Empate si son iguales",
  "confidence": 70,
  "team1_strengths": ["fortaleza 1", "fortaleza 2", "fortaleza 3"],
  "team2_strengths": ["fortaleza 1", "fortaleza 2", "fortaleza 3"],
  "key_player_1": "jugador clave de ${team1.name}",
  "key_player_2": "jugador clave de ${team2.name}",
  "tactics": "incluye aquí tu cálculo de xG de cada equipo en una frase breve",
  "analysis": "narrativa apasionada del partido en 3-4 oraciones"
}`
    : `You are a statistical football simulation engine (not a storyteller). Your only source of truth for the scoreline is the numeric calculation you are about to perform — NOT a typical football pattern or a "common" scoreline.

${t1info}
${t2info}

Random numbers for this simulation (use them as calculation seeds, don't mention them in the final text): seed=${seed}, roll1=${dice1}, roll2=${dice2}

REQUIRED CALCULATION (briefly show your reasoning in the "tactics" field, e.g. "Expected goals: ${team1.name} 2.3 — ${team2.name} 0.8"):
1. Calculate ${team1.name}'s expected goals (xG) as a decimal between 0.0 and 4.0, based on FIFA ranking, recent form, and opponent strength. Use roll1 to vary the result within the plausible range.
2. Calculate ${team2.name}'s expected goals (xG) the same way using roll2.
3. Round each xG to the nearest whole number (standard rounding, not always up or down) to get each team's final goals. These two numbers, exactly as they come out of the calculation, ARE the final scoreline — do not adjust them or replace them with a "typical" result.
4. There is NO forbidden scoreline and NO required scoreline. 0-0, 5-0, 1-4, 3-3 — any combination is valid if that's what your xG calculation produces. Trust the number you calculated, not what "sounds more realistic" from memory.

Reply ONLY with valid JSON (no extra text, no markdown). Do NOT copy the example numbers below — they're only there to show the JSON format, your actual values must come from your calculation:
{
  "score": "${team1.name} <goals1>-<goals2> ${team2.name}",
  "winner": "name of the team with more goals, or Draw if equal",
  "confidence": 70,
  "team1_strengths": ["strength 1", "strength 2", "strength 3"],
  "team2_strengths": ["strength 1", "strength 2", "strength 3"],
  "key_player_1": "key player name from ${team1.name}",
  "key_player_2": "key player name from ${team2.name}",
  "tactics": "include your xG calculation for each team here in one brief sentence",
  "analysis": "passionate 3-4 sentence match narrative"
}`

  // ── Call the API — let auth/config errors bubble up ──
  // Only catch JSON-parse issues (bad response format) and fall back to mock.
  const text = await callClaude({ prompt, system, max_tokens: 650, temperature: 1 })

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    return JSON.parse(jsonMatch[0])
  } catch {
    // Claude responded but not valid JSON → use mock silently
    console.warn('[aiService] Response was not valid JSON, using mock')
    return mockPrediction(team1, team2)
  }
}

// ─────────────────────────────────────────────────────────
// TRIVIA QUESTION (generative)
// Returns question object or null (caller falls back to bank)
// ─────────────────────────────────────────────────────────

export async function generateTriviaQuestion(lang = 'en') {
  const prompt = lang === 'es'
    ? `Genera UNA pregunta de trivia difícil sobre la Copa del Mundo FIFA (cualquier edición). Responde SOLO en JSON sin markdown:
{"q":"pregunta","opts":["A","B","C","D"],"correct":0,"explain":"explicación breve","emoji":"emoji"}`
    : `Generate ONE hard FIFA World Cup trivia question (any edition). Respond ONLY in JSON, no markdown:
{"q":"question","opts":["A","B","C","D"],"correct":0,"explain":"brief explanation","emoji":"emoji"}`

  try {
    const text = await callClaude({ prompt, max_tokens: 300 })
    const jsonMatch = text.match(/\{[\s\S]*?\}/)
    if (!jsonMatch) throw new Error('No JSON')
    return JSON.parse(jsonMatch[0])
  } catch {
    return null
  }
}