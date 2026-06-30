/**
 * Official FIFA 2026 bracket structure.
 * 
 * R32 matches feed into R16 slots in a fixed official order.
 * Each R32 pair (pairIndex 0-15) maps to a specific R16 slot (r16Slot 0-7).
 * Within each r16Slot, pairA feeds the "home" side and pairB feeds the "away" side.
 *
 * Sources: FIFA official bracket draw (2026)
 */
export const R32_TO_R16 = [
  // r16Slot 0
  { pairIndex: 0,  r16Slot: 0, side: 'a' }, // W(A1 vs B2 - Match 49) → R16 slot 0 home
  { pairIndex: 1,  r16Slot: 0, side: 'b' }, // W(C1 vs D2 - Match 50) → R16 slot 0 away
  // r16Slot 1
  { pairIndex: 2,  r16Slot: 1, side: 'a' }, // W(B1 vs A2 - Match 51)
  { pairIndex: 3,  r16Slot: 1, side: 'b' }, // W(D1 vs C2 - Match 52)
  // r16Slot 2
  { pairIndex: 4,  r16Slot: 2, side: 'a' }, // W(E1 vs F2 - Match 53)
  { pairIndex: 5,  r16Slot: 2, side: 'b' }, // W(G1 vs H2 - Match 54)
  // r16Slot 3
  { pairIndex: 6,  r16Slot: 3, side: 'a' }, // W(F1 vs E2 - Match 55)
  { pairIndex: 7,  r16Slot: 3, side: 'b' }, // W(H1 vs G2 - Match 56)
  // r16Slot 4
  { pairIndex: 8,  r16Slot: 4, side: 'a' }, // W(I1 vs J2 - Match 57)
  { pairIndex: 9,  r16Slot: 4, side: 'b' }, // W(K1 vs L2 - Match 58)
  // r16Slot 5
  { pairIndex: 10, r16Slot: 5, side: 'a' }, // W(J1 vs I2 - Match 59)
  { pairIndex: 11, r16Slot: 5, side: 'b' }, // W(L1 vs K2 - Match 60)
  // r16Slot 6
  { pairIndex: 12, r16Slot: 6, side: 'a' }, // W(M1 vs N2 - Match 61) — 3rd-place best
  { pairIndex: 13, r16Slot: 6, side: 'b' }, // W(O1 vs P2 - Match 62)
  // r16Slot 7
  { pairIndex: 14, r16Slot: 7, side: 'a' }, // W(N1 vs M2 - Match 63)
  { pairIndex: 15, r16Slot: 7, side: 'b' }, // W(P1 vs O2 - Match 64)
]

/**
 * Sort R32 fixtures into official bracket order (by match number / date).
 * Returns array of 16 matches in pairIndex order.
 */
export function sortR32ByBracket(r32Matches) {
  if (!r32Matches?.length) return r32Matches || []
  // Sort by date — FIFA schedules R32 matches in official bracket order
  return [...r32Matches].sort((a, b) => new Date(a.date) - new Date(b.date))
}

/**
 * Sort R16 fixtures into official bracket order (by match number / date).
 * Returns array of 8 matches in r16Slot order.
 */
export function sortR16ByBracket(r16Matches) {
  if (!r16Matches?.length) return r16Matches || []
  return [...r16Matches].sort((a, b) => new Date(a.date) - new Date(b.date))
}

/**
 * Given sorted R32 matches, compute the marginTop needed for each R16 card
 * so it sits vertically centered between its two parent R32 cards.
 *
 * @param {number} cardH  - height of a R32 match card (px)
 * @param {number} r16H   - height of a R16 match card (px)
 * @param {number} gap    - gap between R32 cards (px)
 * @returns {number[]}    - array of 8 marginTop values (px)
 */
export function computeR16Offsets(cardH = 82, r16H = 74, gap = 10) {
  const pairHeight = cardH * 2 + gap          // height of two stacked R32 cards
  const offset     = (pairHeight - r16H) / 2  // center R16 card within that span
  // All 8 R16 slots have the same offset when cards are uniform height
  return Array(8).fill(Math.round(offset))
}
