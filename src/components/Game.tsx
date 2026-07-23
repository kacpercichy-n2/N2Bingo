import { useEffect, useMemo, useState } from 'react'
import { BingoBoard } from '@/components/BingoBoard'
import { BingoCelebration } from '@/components/Confetti'
import { Stats } from '@/components/Stats'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { lineLabel, msUntilNextDay } from '@/lib/board'
import { getPlayer, PLAYERS, type Player } from '@/lib/players'
import { useGame } from '@/lib/useGame'

function Countdown() {
  const [left, setLeft] = useState(() => msUntilNextDay())

  useEffect(() => {
    const t = setInterval(() => setLeft(msUntilNextDay()), 1000)
    return () => clearInterval(t)
  }, [])

  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <span className="font-mono tabular-nums">
      {pad(Math.floor(left / 3_600_000))}:{pad(Math.floor((left % 3_600_000) / 60_000))}:
      {pad(Math.floor((left % 60_000) / 1000))}
    </span>
  )
}

/** Mount with `key={day}` — a midnight rollover should reset everything. */
export function Game({ day, player }: { day: string; player: Player }) {
  const game = useGame(day, player.id)
  const [dismissedError, setDismissedError] = useState<string | null>(null)

  // Forget the dismissal once the app recovers, so the same message can be
  // shown again if the problem genuinely comes back.
  useEffect(() => {
    if (!game.error) setDismissedError(null)
  }, [game.error])

  const dayScores = useMemo(() => {
    const counts = new Map<string, number>()
    for (const mark of game.marks.values()) {
      counts.set(mark.player_id, (counts.get(mark.player_id) ?? 0) + 1)
    }
    return PLAYERS.map((p) => ({ player: p, count: counts.get(p.id) ?? 0 }))
  }, [game.marks])

  const totalCells = game.board.cells.filter((c) => !c.free).length
  const marked = game.marks.size
  const visibleError = game.error && game.error !== dismissedError ? game.error : null

  return (
    <>
      <BingoCelebration labels={game.celebrations} onDismiss={game.dismissCelebration} />

      <Tabs defaultValue="board">
        <TabsList className="mb-5 w-full">
          <TabsTrigger value="board" className="flex-1">
            Plansza
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex-1">
            Statystyki
          </TabsTrigger>
        </TabsList>

        <TabsContent value="board">
          {visibleError && (
            <button
              onClick={() => setDismissedError(visibleError)}
              className="border-destructive/40 bg-destructive/10 text-destructive mb-4 flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-xs"
            >
              <span>{visibleError}</span>
              <span className="shrink-0 opacity-60">zamknij ✕</span>
            </button>
          )}

          {game.loading ? (
            <div
              className="grid animate-pulse gap-1.5 sm:gap-2"
              style={{ gridTemplateColumns: `repeat(${game.board.size}, minmax(0, 1fr))` }}
            >
              {game.board.cells.map((_, i) => (
                <div key={i} className="bg-card aspect-square rounded-xl" />
              ))}
            </div>
          ) : (
            <BingoBoard
              board={game.board}
              marks={game.marks}
              me={player}
              pending={game.pending}
              onToggle={game.toggle}
            />
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="bg-card border-border rounded-xl border p-4">
              <div className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
                Dziś na planszy
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-primary text-2xl font-extrabold tabular-nums">
                  {marked}/{totalCells}
                </span>
                <span className="text-muted-foreground text-xs">
                  {game.lines.length > 0 ? `${game.lines.length}× BINGO 🎉` : 'jeszcze bez bingo'}
                </span>
              </div>
              <div className="bg-muted mt-3 h-1.5 overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (marked / totalCells) * 100)}%` }}
                />
              </div>
            </div>

            <div className="bg-card border-border rounded-xl border p-4">
              <div className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
                Kto ile klepnął
              </div>
              <div className="mt-2.5 space-y-1.5">
                {dayScores.map(({ player: p, count }) => (
                  <div key={p.id} className="flex items-center gap-2 text-xs">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: p.color, opacity: count ? 1 : 0.3 }}
                    />
                    <span className={count ? 'font-medium' : 'text-muted-foreground'}>
                      {p.short}
                    </span>
                    <span className="text-muted-foreground ml-auto font-mono tabular-nums">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {game.lines.length > 0 && (
            <div className="border-primary/30 bg-primary/10 mt-3 rounded-xl border p-4">
              <div className="text-primary font-mono text-[10px] tracking-[0.18em] uppercase">
                Osiągnięte dziś
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {game.lines.map((line) => {
                  const by = getPlayer(line.completed_by)
                  return (
                    <span
                      key={line.id}
                      className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                      style={{
                        background: by ? `${by.color}22` : undefined,
                        color: by?.color,
                        border: `1px solid ${by?.color ?? 'currentColor'}55`,
                      }}
                    >
                      {lineLabel(line.line_key, game.board.size)} · {by?.short ?? '?'}
                    </span>
                  )
                })}
              </div>
              <p className="text-muted-foreground/70 mt-2.5 text-[11px]">
                Raz zdobyte bingo zostaje — nawet jeśli ktoś potem odznaczy pole.
              </p>
            </div>
          )}

          <p className="text-muted-foreground/70 mt-5 text-center text-xs">
            Nowa plansza za <Countdown /> · reset codziennie o północy
          </p>
        </TabsContent>

        <TabsContent value="stats">
          {/* Re-aggregates whenever the live board moves, so an open Stats tab
              does not drift out of date while the others keep playing. */}
          <Stats today={day} liveKey={`${game.marks.size}:${game.lines.length}`} />
        </TabsContent>
      </Tabs>
    </>
  )
}
