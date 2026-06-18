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

  // Random seed forces the model to treat each call independently instead of
  // gravitating toward the single most statistically common scoreline (2-1/1-0).
  const seed = Math.floor(Math.random() * 1_000_000)

  const prompt = isEs
    ? `Eres un motor de simulación de partidos. Simula este partido de la Copa del Mundo 2026 paso a paso, como si lanzaras los dados según la fuerza de cada equipo (semilla de aleatoriedad: ${seed} — úsala para variar tu resultado entre simulaciones distintas del mismo partido).

${t1info}
${t2info}

PROCESO OBLIGATORIO (hazlo internamente, no lo muestres en la respuesta):
1. Estima el número esperado de goles de ${team1.name} en este partido específico (considera ranking, forma reciente, y que el fútbol tiene alta varianza — no asumas siempre el mismo número).
2. Estima el número esperado de goles de ${team2.name} de la misma forma.
3. A partir de esos dos números esperados, decide un marcador final concreto. Los marcadores de fútbol reales tienen mucha variación: 0-0, 1-0, 2-1, 3-1, 1-1, 2-0, 4-2, 0-1, etc. son TODOS igualmente válidos dependiendo del partido. NO tengas un marcador "por defecto": cada simulación con una semilla distinta debe poder dar un resultado distinto, incluso para el mismo enfrentamiento.
4. Si el ranking FIFA es muy similar entre ambos equipos, los goles esperados deben ser parecidos (favorece empates o resultados ajustados 1-0, 1-1, 2-1). Si hay una diferencia grande de ranking, el favorito puede ganar por un margen mayor (2-0, 3-0, 3-1) pero los marcadores de sorpresa (underdog gana o empata) también deben ser posibles ocasionalmente, como en el fútbol real.

Responde ÚNICAMENTE con JSON válido (sin texto extra ni markdown), usando esta estructura exacta (los valores son solo ejemplos de formato, NO los uses literalmente):
{
  "score": "${team1.name} X-Y ${team2.name}",
  "winner": "nombre del equipo ganador o Draw/Empate si X=Y",
  "confidence": 70,
  "team1_strengths": ["fortaleza 1", "fortaleza 2", "fortaleza 3"],
  "team2_strengths": ["fortaleza 1", "fortaleza 2", "fortaleza 3"],
  "key_player_1": "jugador clave de ${team1.name}",
  "key_player_2": "jugador clave de ${team2.name}",
  "tactics": "descripción táctica de 1-2 oraciones",
  "analysis": "narrativa apasionada del partido en 3-4 oraciones"
}`
    : `You are a match simulation engine. Simulate this FIFA World Cup 2026 match step by step, as if rolling weighted dice based on each team's strength (randomness seed: ${seed} — use it to vary your result across different simulations of the same fixture).

${t1info}
${t2info}

REQUIRED PROCESS (do this internally, don't show it in your reply):
1. Estimate ${team1.name}'s expected goals in this specific match (factor in ranking, recent form, and remember football has high variance — don't default to the same number every time).
2. Estimate ${team2.name}'s expected goals the same way.
3. From those two expected-goal values, decide on one concrete final scoreline. Real football scorelines vary a lot: 0-0, 1-0, 2-1, 3-1, 1-1, 2-0, 4-2, 0-1, etc. are ALL equally valid depending on the match. Do NOT have a "default" scoreline — each simulation with a different seed should be able to produce a different result, even for the same fixture.
4. If FIFA rankings are close between the two teams, expected goals should be similar (favor draws or tight scorelines like 1-0, 1-1, 2-1). If there's a large ranking gap, the favorite may win by a bigger margin (2-0, 3-0, 3-1), but upset scorelines (underdog wins or draws) should also occasionally be possible, just like in real football.

Reply ONLY with valid JSON (no extra text, no markdown), using this exact structure (the values shown are placeholders for FORMAT only, do NOT use them literally):
{
  "score": "${team1.name} X-Y ${team2.name}",
  "winner": "winning team name, or Draw if X equals Y",
  "confidence": 70,
  "team1_strengths": ["strength 1", "strength 2", "strength 3"],
  "team2_strengths": ["strength 1", "strength 2", "strength 3"],
  "key_player_1": "key player name from ${team1.name}",
  "key_player_2": "key player name from ${team2.name}",
  "tactics": "brief 1-2 sentence tactical breakdown",
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