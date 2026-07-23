import { useEffect, useMemo, useState } from 'react'
import { PLAYERS } from '@/lib/players'
import { Button } from '@/components/ui/button'

const COLORS = [...PLAYERS.map((p) => p.color), '#ffe14d', '#ffffff']

type Props = {
  /** Queue of line labels; the first is shown, the rest follow. */
  labels: string[]
  onDismiss: () => void
}

export function BingoCelebration({ labels, onDismiss }: Props) {
  const label = labels[0]
  // Two lines can close on a single click — say so instead of dropping one.
  const extra = labels.length - 1

  const pieces = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        id: i,
        left: (i * 37) % 100,
        drift: ((i * 53) % 200) - 100,
        delay: ((i * 17) % 60) / 100,
        duration: 1.9 + ((i * 29) % 140) / 100,
        color: COLORS[i % COLORS.length],
        size: 6 + ((i * 13) % 8),
      })),
    [],
  )

  // Restart the timer whenever a new line takes the front of the queue.
  const [, setTick] = useState(0)
  useEffect(() => {
    setTick((n) => n + 1)
    const t = setTimeout(onDismiss, 4200)
    return () => clearTimeout(t)
  }, [label, onDismiss])

  if (!label) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={`${label}-${p.id}`}
          className="animate-confetti absolute top-0 block rounded-[2px]"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.6,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ['--drift' as string]: `${p.drift}px`,
          }}
        />
      ))}

      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} />

      <div
        key={label}
        className="animate-drop-in pointer-events-auto absolute inset-x-0 top-1/3 mx-auto w-fit max-w-[90vw] text-center"
      >
        <div
          className="border-primary/60 rounded-3xl border-2 px-10 py-8"
          style={{ background: '#17171c', boxShadow: '0 20px 70px rgba(0,0,0,0.75)' }}
        >
          <div className="text-primary text-5xl font-extrabold tracking-tight sm:text-6xl">
            BINGO!
          </div>
          <div className="text-muted-foreground mt-2 font-mono text-xs tracking-[0.2em] uppercase">
            {label}
            {extra > 0 && ` +${extra}`}
          </div>
          <Button className="mt-6" onClick={onDismiss}>
            {extra > 0 ? 'Dawaj następne' : 'No i pięknie'}
          </Button>
        </div>
      </div>
    </div>
  )
}
