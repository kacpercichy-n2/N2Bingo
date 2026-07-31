import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildBoard, completedLines, type Board, type Line } from './board'
import { SCHEMA, supabase, type LineRow, type MarkRow } from './supabase'

export type GameState = {
  board: Board
  marks: Map<string, MarkRow>
  lines: LineRow[]
  /** Phrases with a write in flight — their cells stay locked until it lands. */
  pending: ReadonlySet<string>
  loading: boolean
  error: string | null
  /** Labels of lines completed since this tab opened, oldest first. */
  celebrations: string[]
  dismissCelebration: () => void
  toggle: (phraseId: string) => void
}

const FRIENDLY_ERROR = 'Coś nie zaskoczyło — spróbuj jeszcze raz.'

function mergeLines(previous: LineRow[], incoming: LineRow[]): LineRow[] {
  const byKey = new Map(previous.map((l) => [l.line_key, l]))
  for (const row of incoming) byKey.set(row.line_key, row)
  return [...byKey.values()].sort((a, b) => a.created_at.localeCompare(b.created_at))
}

/**
 * Shared board state for one Warsaw day.
 *
 * Mount this with `key={day}` so a midnight rollover throws the whole thing
 * away rather than carrying yesterday's marks into today's board.
 */
export function useGame(day: string, playerId: string | null): GameState {
  const board = useMemo(() => buildBoard(day), [day])

  const [marks, setMarks] = useState<Map<string, MarkRow>>(new Map())
  const [lines, setLines] = useState<LineRow[]>([])
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [celebrations, setCelebrations] = useState<string[]>([])

  // Three distinct questions, deliberately kept apart:
  //  - recorded:    already in the DB, so do not upsert it again
  //  - preexisting: was already scored when this tab last synced, so it is
  //                 history rather than something to throw confetti over
  //  - celebrated:  this tab has already shown it
  // Collapsing these caused observer tabs to miss the celebration whenever the
  // line row arrived over realtime before the mark that completed it.
  const recordedLineKeys = useRef<Set<string>>(new Set())
  const preexistingLineKeys = useRef<Set<string>>(new Set())
  const celebratedLineKeys = useRef<Set<string>>(new Set())
  // Lines are only recorded after the first snapshot lands, otherwise every
  // reload would re-record (and re-celebrate) yesterday's finished lines.
  const seeded = useRef(false)
  // Guards every awaited write: a phrase with an entry here is mid-flight, and
  // results from a superseded attempt are dropped instead of resurrecting rows.
  const inFlight = useRef(new Map<string, number>())
  const writeCounter = useRef(0)
  const aliveRef = useRef(true)

  const marksRef = useRef(marks)
  marksRef.current = marks

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])

  /**
   * Full re-read of the day. Merges rather than replaces, so a slow response
   * can never clobber realtime rows that arrived while it was in flight.
   */
  const load = useCallback(async () => {
    const [marksRes, linesRes] = await Promise.all([
      supabase.from('bingo_marks').select('*').eq('day', day),
      supabase.from('bingo_lines').select('*').eq('day', day),
    ])
    if (!aliveRef.current) return

    if (marksRes.error || linesRes.error) {
      setError('Nie udało się wczytać planszy. Sprawdź połączenie.')
      setLoading(false)
      return
    }

    const freshMarks = marksRes.data as MarkRow[]
    const freshLines = linesRes.data as LineRow[]

    setMarks((prev) => {
      const next = new Map(freshMarks.map((m) => [m.phrase_id, m]))
      // A snapshot taken mid-write must not undo the optimistic state: keep a
      // pending mark, and respect a pending unmark even if the row is still
      // there. Both settle for real when the write returns.
      for (const phraseId of inFlight.current.keys()) {
        const local = prev.get(phraseId)
        if (local) next.set(phraseId, local)
        else next.delete(phraseId)
      }
      return next
    })
    setLines((prev) => mergeLines(prev, freshLines))
    freshLines.forEach((l) => {
      recordedLineKeys.current.add(l.line_key)
      preexistingLineKeys.current.add(l.line_key)
    })

    seeded.current = true
    setLoading(false)
    setError(null)
  }, [day])

  // Subscribe first, then load from inside the SUBSCRIBED callback. Doing it in
  // that order closes the gap where changes committed between the snapshot and
  // the channel going live were lost forever — and it re-syncs after every
  // reconnect, which realtime does not backfill on its own.
  useEffect(() => {
    const channel = supabase
      .channel(`bingo:${day}`)
      .on(
        'postgres_changes',
        // Realtime does not inherit the client's `db.schema` — it reads the WAL
        // and matches on the literal schema name, so it has to be spelled out.
        { event: '*', schema: SCHEMA, table: 'bingo_marks', filter: `day=eq.${day}` },
        (payload) => {
          setMarks((prev) => {
            const next = new Map(prev)
            if (payload.eventType === 'DELETE') {
              const old = payload.old as Partial<MarkRow>
              for (const [phraseId, mark] of next) {
                if (mark.id === old.id) {
                  // Do not undo a mark this tab is currently re-creating.
                  if (!inFlight.current.has(phraseId)) next.delete(phraseId)
                  break
                }
              }
              return next
            }
            const row = payload.new as MarkRow
            if (row.day !== day) return prev
            next.set(row.phrase_id, row)
            return next
          })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: SCHEMA, table: 'bingo_lines', filter: `day=eq.${day}` },
        (payload) => {
          if (payload.eventType === 'DELETE') return
          const row = payload.new as LineRow
          if (row.day !== day) return
          // Only "recorded" — this must not suppress our own celebration if it
          // happens to arrive before the mark that completed the line.
          recordedLineKeys.current.add(row.line_key)
          setLines((prev) => mergeLines(prev, [row]))
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void load()
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setError('Utracono połączenie na żywo. Odświeżam, gdy wróci…')
        }
      })

    // A sleeping laptop misses events with no way to know it. Re-read whenever
    // the tab comes back or the network returns.
    const revalidate = () => {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', revalidate)
    window.addEventListener('online', revalidate)
    window.addEventListener('focus', revalidate)

    return () => {
      document.removeEventListener('visibilitychange', revalidate)
      window.removeEventListener('online', revalidate)
      window.removeEventListener('focus', revalidate)
      void supabase.removeChannel(channel)
    }
  }, [day, load])

  const markedIds = useMemo(() => new Set(marks.keys()), [marks])

  /**
   * Credit the line to whoever placed its most recent mark, computed the same
   * way on every client. All four tabs race to insert, but they now all propose
   * the same `completed_by`, so whoever wins the race records the right person.
   */
  const creditFor = useCallback(
    (line: Line): string => {
      let best: MarkRow | undefined
      for (const index of line.indices) {
        const cell = board.cells[index]
        if (cell.free) continue
        const mark = marks.get(cell.id)
        if (mark && (!best || mark.created_at > best.created_at)) best = mark
      }
      return best?.player_id ?? playerId ?? 'kacper'
    },
    [board, marks, playerId],
  )

  // Record freshly completed lines. Every tab tries; UNIQUE(day, line_key) means
  // exactly one insert lands and the rest are no-ops.
  useEffect(() => {
    if (loading || !seeded.current || !playerId) return

    const complete = completedLines(board, markedIds)

    // Celebrate as soon as the board looks complete — that is what the room
    // reacts to, and it must not wait on a round-trip.
    const toCelebrate = complete.filter(
      (line) =>
        !celebratedLineKeys.current.has(line.key) && !preexistingLineKeys.current.has(line.key),
    )
    if (toCelebrate.length > 0) {
      toCelebrate.forEach((line) => celebratedLineKeys.current.add(line.key))
      setCelebrations((prev) => [...prev, ...toCelebrate.map((l) => l.label)])
    }

    // Writing is a different matter. While any mark in the line is still
    // optimistic, every racing tab believes *itself* to be the most recent
    // marker, so they no longer agree on `completed_by` — and whichever tab
    // wins the upsert stamps the wrong name. Wait for server rows.
    const settled = complete.filter(
      (line) =>
        !recordedLineKeys.current.has(line.key) &&
        line.indices.every((i) => {
          const cell = board.cells[i]
          if (cell.free) return true
          const mark = marks.get(cell.id)
          return !!mark && !mark.id.startsWith('optimistic-')
        }),
    )
    if (settled.length === 0) return

    settled.forEach((line) => recordedLineKeys.current.add(line.key))

    void (async () => {
      const { data, error: lineError } = await supabase
        .from('bingo_lines')
        .upsert(
          settled.map((line) => ({
            day,
            line_key: line.key,
            completed_by: creditFor(line),
          })),
          { onConflict: 'day,line_key', ignoreDuplicates: true },
        )
        .select()

      if (!aliveRef.current) return

      if (lineError) {
        // Let the next mark retry it; the line stays celebrated locally.
        settled.forEach((line) => recordedLineKeys.current.delete(line.key))
        return
      }

      const inserted = (data ?? []) as LineRow[]
      if (inserted.length > 0) setLines((prev) => mergeLines(prev, inserted))

      // Lines another tab won are absent from `data`. Read them back rather
      // than trusting realtime to deliver, so the chips are never missing.
      if (inserted.length < settled.length) {
        const missing = settled
          .map((l) => l.key)
          .filter((key) => !inserted.some((row) => row.line_key === key))
        const { data: existing } = await supabase
          .from('bingo_lines')
          .select('*')
          .eq('day', day)
          .in('line_key', missing)
        if (aliveRef.current && existing) setLines((prev) => mergeLines(prev, existing as LineRow[]))
      }
    })()
  }, [board, marks, markedIds, loading, playerId, day, creditFor])

  const setPhrasePending = useCallback((phraseId: string, on: boolean) => {
    setPending((prev) => {
      if (on === prev.has(phraseId)) return prev
      const next = new Set(prev)
      if (on) next.add(phraseId)
      else next.delete(phraseId)
      return next
    })
  }, [])

  const toggle = useCallback(
    (phraseId: string) => {
      if (!playerId) return
      // A second click while the first is still travelling used to issue a
      // delete against a synthetic id and park a raw Postgres error on screen.
      if (inFlight.current.has(phraseId)) return

      const token = ++writeCounter.current
      inFlight.current.set(phraseId, token)
      setPhrasePending(phraseId, true)

      const settle = () => {
        if (inFlight.current.get(phraseId) === token) {
          inFlight.current.delete(phraseId)
          setPhrasePending(phraseId, false)
        }
      }
      const superseded = () => inFlight.current.get(phraseId) !== token || !aliveRef.current

      void (async () => {
        try {
          const existing = marksRef.current.get(phraseId)

          if (existing) {
            setMarks((prev) => {
              const next = new Map(prev)
              next.delete(phraseId)
              return next
            })

            const { error: delError } = await supabase
              .from('bingo_marks')
              .delete()
              .eq('id', existing.id)

            if (superseded()) return
            if (delError) {
              setMarks((prev) => new Map(prev).set(phraseId, existing))
              setError(FRIENDLY_ERROR)
              return
            }
            setError(null)
            return
          }

          const optimistic: MarkRow = {
            id: `optimistic-${phraseId}`,
            day,
            phrase_id: phraseId,
            player_id: playerId,
            created_at: new Date().toISOString(),
          }
          setMarks((prev) => new Map(prev).set(phraseId, optimistic))

          const { data, error: insError } = await supabase
            .from('bingo_marks')
            .insert({ day, phrase_id: phraseId, player_id: playerId })
            .select()
            .single()

          if (superseded()) return

          if (insError) {
            // Someone else claimed the cell first — adopt their row. If the row
            // is gone by now the cell was freed mid-race, so just release it.
            const { data: winner } = await supabase
              .from('bingo_marks')
              .select('*')
              .eq('day', day)
              .eq('phrase_id', phraseId)
              .maybeSingle()

            if (superseded()) return
            setMarks((prev) => {
              const next = new Map(prev)
              if (winner) next.set(phraseId, winner as MarkRow)
              else next.delete(phraseId)
              return next
            })
            // No winner means the write genuinely failed (offline, or a click
            // that landed on the previous day at the midnight boundary). Say
            // so — otherwise the mark just silently undoes itself.
            if (!winner) setError(FRIENDLY_ERROR)
            return
          }

          setMarks((prev) => new Map(prev).set(phraseId, data as MarkRow))
          setError(null)
        } finally {
          settle()
        }
      })()
    },
    [playerId, day, setPhrasePending],
  )

  const dismissCelebration = useCallback(() => setCelebrations((prev) => prev.slice(1)), [])

  return {
    board,
    marks,
    lines,
    pending,
    loading,
    error,
    celebrations,
    dismissCelebration,
    toggle,
  }
}
