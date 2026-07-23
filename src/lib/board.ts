import { FREE_CELL, PHRASES, type Phrase } from './phrases'

export const TIMEZONE = 'Europe/Warsaw'

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** `YYYY-MM-DD` in Warsaw time — the key everything daily hangs off. */
export function dayKey(date: Date = new Date()): string {
  return dayFormatter.format(date)
}

const prettyDayFormatter = new Intl.DateTimeFormat('pl-PL', {
  timeZone: TIMEZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

export function prettyDay(day: string): string {
  // Noon UTC keeps the date stable regardless of the Warsaw offset.
  return prettyDayFormatter.format(new Date(`${day}T12:00:00Z`))
}

/**
 * Milliseconds until the Warsaw day rolls over.
 *
 * Steps forward in hours to find the boundary, then binary-searches to the
 * second. Comparing formatted day strings (rather than doing offset maths)
 * keeps this correct across both DST transitions. Called once a second, so it
 * deliberately avoids the minute-by-minute scan it used to do.
 */
export function msUntilNextDay(now: Date = new Date()): number {
  const start = now.getTime()
  const current = dayKey(now)

  let lo = start
  let hi = 0
  for (let hours = 1; hours <= 26; hours++) {
    const probe = start + hours * 3_600_000
    if (dayKey(new Date(probe)) !== current) {
      hi = probe
      break
    }
    lo = probe
  }
  if (!hi) return 3_600_000

  while (hi - lo > 1000) {
    const mid = Math.floor((lo + hi) / 2)
    if (dayKey(new Date(mid)) === current) lo = mid
    else hi = mid
  }
  return Math.max(0, hi - start)
}

/** Start of a Warsaw day as an absolute instant — for "how fast was it" maths. */
export function dayStart(day: string): Date {
  // Midday UTC is inside the target day for every European offset; walk back to
  // the first instant that still formats as `day`.
  const noon = new Date(`${day}T12:00:00Z`).getTime()
  let lo = noon - 36 * 3_600_000
  let hi = noon
  while (hi - lo > 1000) {
    const mid = Math.floor((lo + hi) / 2)
    if (dayKey(new Date(mid)) === day) hi = mid
    else lo = mid
  }
  return new Date(hi)
}

function hashSeed(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const out = items.slice()
  const rand = mulberry32(seed)
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export type BoardCell = Phrase & { free: boolean }

export type Board = {
  day: string
  size: number
  cells: BoardCell[]
}

/**
 * Same phrases for everyone on a given day, reshuffled at midnight.
 * 5×5 with a free centre once the pool is big enough, otherwise 4×4.
 */
export function buildBoard(day: string): Board {
  const size = PHRASES.length >= 24 ? 5 : 4
  const freeIndex = size % 2 === 1 ? Math.floor((size * size) / 2) : -1
  const needed = size * size - (freeIndex >= 0 ? 1 : 0)

  const picked = seededShuffle(PHRASES, hashSeed(`n2bingo:${day}`)).slice(0, needed)

  const cells: BoardCell[] = []
  let cursor = 0
  for (let i = 0; i < size * size; i++) {
    if (i === freeIndex) cells.push({ ...FREE_CELL, free: true })
    else cells.push({ ...picked[cursor++], free: false })
  }

  return { day, size, cells }
}

export type Line = { key: string; indices: number[]; label: string }

export function buildLines(size: number): Line[] {
  const lines: Line[] = []

  for (let r = 0; r < size; r++) {
    lines.push({
      key: `row-${r}`,
      label: `Rząd ${r + 1}`,
      indices: Array.from({ length: size }, (_, c) => r * size + c),
    })
  }
  for (let c = 0; c < size; c++) {
    lines.push({
      key: `col-${c}`,
      label: `Kolumna ${c + 1}`,
      indices: Array.from({ length: size }, (_, r) => r * size + c),
    })
  }
  lines.push({
    key: 'diag-main',
    label: 'Przekątna ↘',
    indices: Array.from({ length: size }, (_, i) => i * size + i),
  })
  lines.push({
    key: 'diag-anti',
    label: 'Przekątna ↗',
    indices: Array.from({ length: size }, (_, i) => i * size + (size - 1 - i)),
  })

  return lines
}

/** Human label for a stored `line_key`, e.g. `row-2` → `Rząd 3`. */
export function lineLabel(key: string, size = 4): string {
  return buildLines(size).find((l) => l.key === key)?.label ?? key
}

/** Line keys where every cell is marked (free cells always count). */
export function completedLines(board: Board, markedIds: ReadonlySet<string>): Line[] {
  return buildLines(board.size).filter((line) =>
    line.indices.every((i) => {
      const cell = board.cells[i]
      return cell.free || markedIds.has(cell.id)
    }),
  )
}
