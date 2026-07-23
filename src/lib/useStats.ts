import { useCallback, useEffect, useState } from 'react'
import { supabase, type LineRow, type MarkRow } from './supabase'

export type Stats = {
  marks: MarkRow[]
  lines: LineRow[]
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * The whole history is a few thousand rows at most, so pull it once and
 * aggregate in the browser rather than maintaining SQL views.
 */
export function useStats(...refreshKeys: unknown[]): Stats {
  const [marks, setMarks] = useState<MarkRow[]>([])
  const [lines, setLines] = useState<LineRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  const keySignature = refreshKeys.join('|')

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const [marksRes, linesRes] = await Promise.all([
        supabase.from('bingo_marks').select('*').order('created_at', { ascending: true }),
        supabase.from('bingo_lines').select('*').order('created_at', { ascending: true }),
      ])
      if (cancelled) return

      if (marksRes.error || linesRes.error) {
        setError('Nie udało się policzyć statystyk. Sprawdź połączenie.')
      } else {
        setError(null)
        setMarks(marksRes.data as MarkRow[])
        setLines(linesRes.data as LineRow[])
      }
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [nonce, keySignature])

  return { marks, lines, loading, error, reload }
}
