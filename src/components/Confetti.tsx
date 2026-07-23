import { useEffect, useMemo, useState } from 'react'
import { PLAYERS } from '@/lib/players'
import { Button } from '@/components/ui/button'

const COLORS = [...PLAYERS.map((p) => p.color), '#ffe14d', '#ffffff']

export function BingoCelebration({ label, onClose }: { label: string; onClose: () => void }) {
  const [visible, setVisible] = useState(true)

  const pieces = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        drift: (Math.random() - 0.5) * 260,
        delay: Math.random() * 0.6,
        duration: 1.9 + Math.random() * 1.4,
        color: COLORS[i % COLORS.length],
        size: 6 + Math.random() * 8,
      })),
    [],
  )

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 4200)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!visible) onClose()
  }, [visible, onClose])

  if (!visible) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
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

      <div className="animate-drop-in pointer-events-auto absolute inset-x-0 top-1/3 mx-auto w-fit max-w-[90vw] text-center">
        <div
          className="border-primary/60 rounded-3xl border-2 px-10 py-8"
          style={{ background: '#17171c', boxShadow: '0 20px 70px rgba(0,0,0,0.75)' }}
        >
          <div className="text-primary text-5xl font-extrabold tracking-tight sm:text-6xl">
            BINGO!
          </div>
          <div className="text-muted-foreground mt-2 font-mono text-xs tracking-[0.2em] uppercase">
            {label}
          </div>
          <Button className="mt-6" onClick={() => setVisible(false)}>
            No i pięknie
          </Button>
        </div>
      </div>
    </div>
  )
}
