import { useEffect, useMemo, useState } from 'react'
import { BingoBoard } from '@/components/BingoBoard'
import { BingoCelebration } from '@/components/Confetti'
import { Login } from '@/components/Login'
import { Stats } from '@/components/Stats'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { msUntilNextDay, prettyDay } from '@/lib/board'
import { getPlayer, PLAYERS } from '@/lib/players'
import { useDay } from '@/lib/useDay'
import { useGame } from '@/lib/useGame'
import { useIdentity } from '@/lib/useIdentity'

function Countdown() {
  const [left, setLeft] = useState(() => msUntilNextDay())

  useEffect(() => {
    const t = setInterval(() => setLeft(msUntilNextDay()), 1000)
    return () => clearInterval(t)
  }, [])

  const h = Math.floor(left / 3_600_000)
  const m = Math.floor((left % 3_600_000) / 60_000)
  const s = Math.floor((left % 60_000) / 1000)
  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <span className="font-mono tabular-nums">
      {pad(h)}:{pad(m)}:{pad(s)}
    </span>
  )
}

export default function App() {
  const { player, signIn, signOut } = useIdentity()
  const day = useDay()
  const game = useGame(day, player?.id ?? null)

  const dayScores = useMemo(() => {
    const counts = new Map<string, number>()
    for (const mark of game.marks.values()) {
      counts.set(mark.player_id, (counts.get(mark.player_id) ?? 0) + 1)
    }
    return PLAYERS.map((p) => ({ player: p, count: counts.get(p.id) ?? 0 }))
  }, [game.marks])

  if (!player) return <Login onPick={signIn} />

  const totalCells = game.board.cells.filter((c) => !c.free).length
  const marked = game.marks.size

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      {game.freshBingo && (
        <BingoCelebration label={game.freshBingo} onClose={game.clearFreshBingo} />
      )}

      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-primary font-mono text-[10px] tracking-[0.3em] uppercase">
            N2 Media · biuro bingo
          </div>
          <h1 className="mt-1 truncate text-2xl leading-tight font-extrabold tracking-tight sm:text-3xl">
            {prettyDay(day)}
          </h1>
        </div>

        <button
          onClick={signOut}
          className="group flex shrink-0 items-center gap-2"
          title="Zmień osobę"
        >
          <span className="hidden text-right sm:block">
            <span className="block text-sm leading-tight font-semibold">{player.short}</span>
            <span className="text-muted-foreground group-hover:text-foreground block text-[10px] transition-colors">
              zmień
            </span>
          </span>
          <span
            className="grid size-10 place-items-center rounded-full font-mono text-xs font-bold ring-2 ring-transparent transition-all group-hover:ring-white/30"
            style={{ background: player.color, color: player.ink }}
          >
            {player.initials}
          </span>
        </button>
      </header>

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
          {game.error && (
            <div className="border-destructive/40 bg-destructive/10 text-destructive mb-4 rounded-lg border px-3 py-2 text-xs">
              {game.error}
            </div>
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
                  {game.lines.length > 0
                    ? `${game.lines.length}× BINGO 🎉`
                    : 'jeszcze bez bingo'}
                </span>
              </div>
              <div className="bg-muted mt-3 h-1.5 overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${(marked / totalCells) * 100}%` }}
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
                Bingo dnia
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {game.lines.map((line) => {
                  const by = getPlayer(line.completed_by)
                  return (
                    <span
                      key={line.id}
                      className="rounded-full px-2.5 py-1 font-mono text-[11px] font-bold"
                      style={{
                        background: by ? `${by.color}22` : undefined,
                        color: by?.color,
                        border: `1px solid ${by?.color ?? 'currentColor'}55`,
                      }}
                    >
                      {line.line_key} · {by?.short ?? '?'}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          <p className="text-muted-foreground/70 mt-5 text-center text-xs">
            Nowa plansza za <Countdown /> · reset codziennie o północy
          </p>
        </TabsContent>

        <TabsContent value="stats">
          <Stats today={day} />
        </TabsContent>
      </Tabs>

      <footer className="text-muted-foreground/50 mt-10 text-center text-[11px]">
        Kompleksowo, kreatywnie i precyzyjnie. <span className="text-primary/60">N2 Media</span>
      </footer>

      <div className="h-6" />
    </div>
  )
}
