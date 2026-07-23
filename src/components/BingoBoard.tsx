import { useEffect, useMemo, useRef, useState } from 'react'
import type { Board } from '@/lib/board'
import { buildLines, completedLines } from '@/lib/board'
import { getPlayer, type Player } from '@/lib/players'
import type { MarkRow } from '@/lib/supabase'
import { cn } from '@/lib/utils'

type Props = {
  board: Board
  marks: Map<string, MarkRow>
  me: Player
  pending: ReadonlySet<string>
  onToggle: (phraseId: string) => void
  disabled?: boolean
}

export function BingoBoard({ board, marks, me, pending, onToggle, disabled }: Props) {
  const markedIds = useMemo(() => new Set(marks.keys()), [marks])

  const winningIndices = useMemo(() => {
    const done = completedLines(board, markedIds)
    const keys = new Set(done.map((l) => l.key))
    const set = new Set<number>()
    buildLines(board.size)
      .filter((l) => keys.has(l.key))
      .forEach((l) => l.indices.forEach((i) => set.add(i)))
    return set
  }, [board, markedIds])

  // Track which cells changed since last render so only those animate. The
  // first non-empty snapshot is adopted silently, otherwise every already
  // marked cell would stamp itself on page load.
  const previous = useRef<Set<string> | null>(null)
  const [justMarked, setJustMarked] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (previous.current === null) {
      previous.current = new Set(markedIds)
      return
    }

    const added = [...markedIds].filter((id) => !previous.current!.has(id))
    previous.current = new Set(markedIds)
    if (added.length === 0) return

    // Union, so a second mark arriving mid-animation does not cut the first
    // one short; each id clears on its own timer.
    setJustMarked((prev) => new Set([...prev, ...added]))
    const t = setTimeout(
      () =>
        setJustMarked((prev) => {
          const next = new Set(prev)
          added.forEach((id) => next.delete(id))
          return next
        }),
      400,
    )
    return () => clearTimeout(t)
  }, [markedIds])

  return (
    <div
      className="grid gap-1.5 sm:gap-2"
      style={{ gridTemplateColumns: `repeat(${board.size}, minmax(0, 1fr))` }}
    >
      {board.cells.map((cell, index) => {
        const mark = marks.get(cell.id)
        const owner = getPlayer(mark?.player_id)
        const isWinning = winningIndices.has(index)

        if (cell.free) {
          return (
            <div
              key={`free-${index}`}
              className={cn(
                'bg-primary/15 text-primary ring-primary/40 grid aspect-square place-items-center rounded-xl ring-1',
                isWinning && 'bg-primary/25',
              )}
            >
              <span className="text-xl font-extrabold sm:text-3xl">N2</span>
              <span className="font-mono text-[9px] tracking-[0.2em] uppercase opacity-70">
                free
              </span>
            </div>
          )
        }

        const mine = owner?.id === me.id
        const busy = pending.has(cell.id)

        return (
          <button
            key={cell.id}
            onClick={() => onToggle(cell.id)}
            disabled={disabled || busy || (!!owner && !mine)}
            title={owner ? `Zaznaczył(a): ${owner.name}` : 'Kliknij, żeby zaznaczyć'}
            className={cn(
              'group relative grid aspect-square place-items-center overflow-hidden rounded-xl p-2 text-center transition-all duration-150 sm:p-3',
              'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
              owner
                ? 'shadow-lg'
                : 'bg-card hover:bg-accent border-border hover:border-primary/40 border active:scale-[0.97]',
              !!owner && !mine && 'cursor-not-allowed',
              busy && 'cursor-progress opacity-80',
              justMarked.has(cell.id) && 'animate-stamp',
            )}
            style={
              owner
                ? {
                    background: owner.color,
                    color: owner.ink,
                    boxShadow: isWinning ? `0 0 0 3px ${owner.color}, 0 0 26px ${owner.color}66` : undefined,
                  }
                : undefined
            }
          >
            <span
              className={cn(
                'text-[11px] leading-tight font-semibold text-balance sm:text-sm',
                cell.text.length > 34 && 'text-[10px] sm:text-xs',
              )}
            >
              {cell.text}
            </span>

            {owner ? (
              <span className="absolute right-2 bottom-1.5 font-mono text-[9px] font-bold tracking-wider opacity-75 sm:text-[10px]">
                {owner.initials}
              </span>
            ) : (
              <span className="border-muted-foreground/25 group-hover:border-primary/70 absolute right-2 bottom-2 size-3 rounded-full border-2 transition-colors sm:size-3.5" />
            )}
          </button>
        )
      })}
    </div>
  )
}
