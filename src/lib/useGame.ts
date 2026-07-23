import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildBoard, completedLines, type Board } from './board'
import { supabase, type LineRow, type MarkRow } from './supabase'

export type GameState = {
  board: Board
  marks: Map<string, MarkRow>
  lines: LineRow[]
  loading: boolean
  error: string | null
  /** Line keys completed since this session opened — used to fire the confetti. */
  freshBingo: string | null
  clearFreshBingo: () => void
  toggle: (phraseId: string) => Promise<void>
}

export function useGame(day: string, playerId: string | null): GameState {
  const board = useMemo(() => buildBoard(day), [day])
  const [marks, setMarks] = useState<Map<string, MarkRow>>(new Map())
  const [lines, setLines] = useState<LineRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [freshBingo, setFreshBingo] = useState<string | null>(null)

  const knownLineKeys = useRef<Set<string>>(new Set())
  const seededLines = useRef(false)

  // Load today's state and subscribe to everyone else's clicks.
  useEffect(() => {
    let cancelled = false
    seededLines.current = false
    knownLineKeys.current = new Set()
    setLoading(true)
    setError(null)

    const load = async () => {
      const [marksRes, linesRes] = await Promise.all([
        supabase.from('bingo_marks').select('*').eq('day', day),
        supabase.from('bingo_lines').select('*').eq('day', day),
      ])
      if (cancelled) return

      if (marksRes.error || linesRes.error) {
        setError(marksRes.error?.message ?? linesRes.error?.message ?? 'Nie udało się wczytać planszy')
        setLoading(false)
        return
      }

      setMarks(new Map((marksRes.data as MarkRow[]).map((m) => [m.phrase_id, m])))
      const loadedLines = linesRes.data as LineRow[]
      setLines(loadedLines)
      knownLineKeys.current = new Set(loadedLines.map((l) => l.line_key))
      seededLines.current = true
      setLoading(false)
    }

    void load()

    const channel = supabase
      .channel(`bingo:${day}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bingo_marks', filter: `day=eq.${day}` },
        (payload) => {
          setMarks((prev) => {
            const next = new Map(prev)
            if (payload.eventType === 'DELETE') {
              const old = payload.old as Partial<MarkRow>
              for (const [phraseId, mark] of next) {
                if (mark.id === old.id) {
                  next.delete(phraseId)
                  break
                }
              }
            } else {
              const row = payload.new as MarkRow
              next.set(row.phrase_id, row)
            }
            return next
          })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bingo_lines', filter: `day=eq.${day}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const old = payload.old as Partial<LineRow>
            setLines((prev) => prev.filter((l) => l.id !== old.id))
            return
          }
          const row = payload.new as LineRow
          setLines((prev) => (prev.some((l) => l.id === row.id) ? prev : [...prev, row]))
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [day])

  const markedIds = useMemo(() => new Set(marks.keys()), [marks])

  // Whoever's browser notices a fresh line first records it. The unique
  // (day, line_key) index makes the race harmless.
  useEffect(() => {
    if (loading || !seededLines.current || !playerId) return

    const done = completedLines(board, markedIds)
    const unseen = done.filter((line) => !knownLineKeys.current.has(line.key))
    if (unseen.length === 0) return

    unseen.forEach((line) => knownLineKeys.current.add(line.key))
    setFreshBingo(unseen[0].label)

    void (async () => {
      const { data, error: lineError } = await supabase
        .from('bingo_lines')
        .upsert(
          unseen.map((line) => ({ day, line_key: line.key, completed_by: playerId })),
          { onConflict: 'day,line_key', ignoreDuplicates: true },
        )
        .select()

      if (lineError) {
        // Roll back so a retry is possible once the connection is back.
        unseen.forEach((line) => knownLineKeys.current.delete(line.key))
        setError(lineError.message)
        return
      }

      const rows = (data ?? []) as LineRow[]
      if (rows.length > 0) {
        setLines((prev) => {
          const known = new Set(prev.map((l) => l.id))
          return [...prev, ...rows.filter((r) => !known.has(r.id))]
        })
      }
    })()
  }, [board, markedIds, loading, playerId, day])

  const toggle = useCallback(
    async (phraseId: string) => {
      if (!playerId) return
      const existing = marks.get(phraseId)

      if (existing) {
        // Optimistic remove, restored if the write fails.
        setMarks((prev) => {
          const next = new Map(prev)
          next.delete(phraseId)
          return next
        })
        const { error: delError } = await supabase.from('bingo_marks').delete().eq('id', existing.id)
        if (delError) {
          setMarks((prev) => new Map(prev).set(phraseId, existing))
          setError(delError.message)
        }
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

      if (insError) {
        // Most likely someone else claimed the cell first — take their row.
        const { data: winner } = await supabase
          .from('bingo_marks')
          .select('*')
          .eq('day', day)
          .eq('phrase_id', phraseId)
          .maybeSingle()

        setMarks((prev) => {
          const next = new Map(prev)
          if (winner) next.set(phraseId, winner as MarkRow)
          else next.delete(phraseId)
          return next
        })
        if (!winner) setError(insError.message)
        return
      }

      setMarks((prev) => new Map(prev).set(phraseId, data as MarkRow))
    },
    [marks, playerId, day],
  )

  const clearFreshBingo = useCallback(() => setFreshBingo(null), [])

  return { board, marks, lines, loading, error, freshBingo, clearFreshBingo, toggle }
}
