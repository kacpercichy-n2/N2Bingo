import { Game } from '@/components/Game'
import { Login } from '@/components/Login'
import { prettyDay } from '@/lib/board'
import { useDay } from '@/lib/useDay'
import { useIdentity } from '@/lib/useIdentity'

export default function App() {
  const { player, signIn, signOut } = useIdentity()
  const day = useDay()

  if (!player) return <Login onPick={signIn} />

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
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

      {/* Keyed on the day so midnight discards yesterday's marks, lines and
          timers instead of briefly painting them onto the new board. */}
      <Game key={day} day={day} player={player} />

      <footer className="text-muted-foreground/50 mt-10 text-center text-[11px]">
        Kompleksowo, kreatywnie i precyzyjnie. <span className="text-primary/60">N2 Media</span>
      </footer>

      <div className="h-6" />
    </div>
  )
}
