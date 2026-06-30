/**
 * Official FIFA 2026 knockout bracket structure.
 * Source: FIFA/Wikipedia official bracket draw.
 *
 * R32 match order (top to bottom, matches 73-88):
 *   73: 2A vs 2B        74: 1E vs 3°(A/B/C/D/F)
 *   75: 1F vs 2C        76: 1C vs 2F
 *   77: 1I vs 3°(...)   78: 2E vs 2I
 *   79: 1A vs 3°(...)   80: 1L vs 3°(...)
 *   81: 1D vs 3°(...)   82: 1G vs 3°(...)
 *   83: 2K vs 2L        84: 1H vs 2J
 *   85: 1B vs 3°(...)   86: 1J vs 2H
 *   87: 1K vs 3°(...)   88: 2D vs 2G
 *
 * R16 mapping (matches 89-96):
 *   89: W(74) vs W(77)  90: W(73) vs W(75)
 *   91: W(76) vs W(78)  92: W(79) vs W(80)
 *   93: W(83) vs W(84)  94: W(81) vs W(82)
 *   95: W(86) vs W(88)  96: W(85) vs W(87)
 */

// R32 official order — index 0-15 = matches 73-88
// Each entry: { matchNum, r16Match, r16Side }
// r16Side 'a' = first team (home), 'b' = second team (away)
export const R32_BRACKET = [
  { matchNum: 73, r16Match: 90, r16Side: 'a' }, // 0  W(73) → R16 M90 home
  { matchNum: 74, r16Match: 89, r16Side: 'a' }, // 1  W(74) → R16 M89 home
  { matchNum: 75, r16Match: 90, r16Side: 'b' }, // 2  W(75) → R16 M90 away
  { matchNum: 76, r16Match: 91, r16Side: 'a' }, // 3  W(76) → R16 M91 home
  { matchNum: 77, r16Match: 89, r16Side: 'b' }, // 4  W(77) → R16 M89 away
  { matchNum: 78, r16Match: 91, r16Side: 'b' }, // 5  W(78) → R16 M91 away
  { matchNum: 79, r16Match: 92, r16Side: 'a' }, // 6  W(79) → R16 M92 home
  { matchNum: 80, r16Match: 92, r16Side: 'b' }, // 7  W(80) → R16 M92 away
  { matchNum: 81, r16Match: 94, r16Side: 'a' }, // 8  W(81) → R16 M94 home
  { matchNum: 82, r16Match: 94, r16Side: 'b' }, // 9  W(82) → R16 M94 away
  { matchNum: 83, r16Match: 93, r16Side: 'a' }, // 10 W(83) → R16 M93 home
  { matchNum: 84, r16Match: 93, r16Side: 'b' }, // 11 W(84) → R16 M93 away
  { matchNum: 85, r16Match: 96, r16Side: 'a' }, // 12 W(85) → R16 M96 home
  { matchNum: 86, r16Match: 95, r16Side: 'a' }, // 13 W(86) → R16 M95 home
  { matchNum: 87, r16Match: 96, r16Side: 'b' }, // 14 W(87) → R16 M96 away
  { matchNum: 88, r16Match: 95, r16Side: 'b' }, // 15 W(88) → R16 M95 away
]

// R16 official order — matches 89-96 top to bottom
export const R16_ORDER = [89, 90, 91, 92, 93, 94, 95, 96]

// QF → SF → Final mapping (for future use)
export const QF_ORDER  = [97, 98, 99, 100]
export const SF_ORDER  = [101, 102]
export const THIRD_PLACE = 103
export const FINAL     = 104

/**
 * Maps API-Football fixture IDs to their official bracket position (0-indexed).
 * Position 0 = top of bracket, 15 = bottom.
 * Order is arranged so consecutive pairs feed the same R16 slot:
 *   positions 0,1  → R16 M89
 *   positions 2,3  → R16 M90
 *   positions 4,5  → R16 M91
 *   positions 6,7  → R16 M92
 *   positions 8,9  → R16 M93
 *   positions 10,11 → R16 M94
 *   positions 12,13 → R16 M95
 *   positions 14,15 → R16 M96
 */
export const R32_FIXTURE_ORDER = {
  1565176: 0,  // Germany vs Paraguay        (M74)
  1565177: 1,  // France vs Sweden            (M77)
  1561329: 2,  // South Africa vs Canada      (M73)
  1562345: 3,  // Netherlands vs Morocco      (M75)
  1562344: 4,  // Brazil vs Japan             (M76)
  1564789: 5,  // Ivory Coast vs Norway       (M78)
  1567306: 6,  // Mexico vs Ecuador           (M79)
  1567307: 7,  // England vs Congo DR         (M80)
  1567309: 8,  // Portugal vs Croatia         (M83)
  1567311: 9,  // Spain vs Austria            (M84)
  1562586: 10, // USA vs Bosnia               (M81)
  1567308: 11, // Belgium vs Senegal          (M82)
  1565179: 12, // Argentina vs Cape Verde     (M86)
  1565178: 13, // Australia vs Egypt          (M88)
  1567312: 14, // Switzerland vs Algeria      (M85)
  1567310: 15, // Colombia vs Ghana           (M87)
}

/**
 * Sort R32 fixtures into official bracket order using fixture IDs.
 * Falls back to date sort for unknown IDs.
 */
export function sortR32ByBracket(r32Matches) {
  if (!r32Matches?.length) return r32Matches || []
  return [...r32Matches].sort((a, b) => {
    const ai = R32_FIXTURE_ORDER[a.id] ?? 99
    const bi = R32_FIXTURE_ORDER[b.id] ?? 99
    if (ai === 99 && bi === 99) return new Date(a.date) - new Date(b.date)
    return ai - bi
  })
}

/**
 * Sort R16 fixtures into official bracket order (matches 89-96 top to bottom).
 */
export function sortR16ByBracket(r16Matches) {
  if (!r16Matches?.length) return r16Matches || []
  return [...r16Matches].sort((a, b) => new Date(a.date) - new Date(b.date))
}

/**
 * Compute marginTop for each R16 card so it sits vertically centered
 * between its two parent R32 cards.
 *
 * R16 pairs (by slot position, top to bottom):
 *   Slot 0 (M89): R32 matches at positions 1,4  (74,77) → rows 1 and 4
 *   Slot 1 (M90): R32 matches at positions 0,2  (73,75) → rows 0 and 2
 *   Slot 2 (M91): R32 matches at positions 3,5  (76,78) → rows 3 and 5
 *   Slot 3 (M92): R32 matches at positions 6,7  (79,80) → rows 6 and 7
 *   Slot 4 (M93): R32 matches at positions 10,11 (83,84) → rows 10 and 11
 *   Slot 5 (M94): R32 matches at positions 8,9  (81,82) → rows 8 and 9
 *   Slot 6 (M95): R32 matches at positions 13,15 (86,88) → rows 13 and 15
 *   Slot 7 (M96): R32 matches at positions 12,14 (85,87) → rows 12 and 14
 *
 * @param {number} cardH  height of R32 card in px
 * @param {number} r16H   height of R16 card in px
 * @param {number} gap    gap between cards in px
 */
export function computeR16Offsets(cardH = 82, r16H = 74, gap = 10) {
  // For each R16 slot, the two parent R32 rows (0-indexed positions in sorted R32 array)
  const parentRows = [
    [1, 4],   // M89: rows for M74 and M77
    [0, 2],   // M90: rows for M73 and M75
    [3, 5],   // M91: rows for M76 and M78
    [6, 7],   // M92: rows for M79 and M80
    [10, 11], // M93: rows for M83 and M84
    [8, 9],   // M94: rows for M81 and M82
    [13, 15], // M95: rows for M86 and M88
    [12, 14], // M96: rows for M85 and M87
  ]

  return parentRows.map(([topRow, botRow]) => {
    // Top edge of the top parent card
    const topEdge = topRow * (cardH + gap)
    // Bottom edge of the bottom parent card
    const botEdge = botRow * (cardH + gap) + cardH
    // Center the R16 card in that span
    return Math.round(topEdge + (botEdge - topEdge - r16H) / 2)
  })
}