import { PLAYERS } from '@/lib/players'
import { Card } from '@/components/ui/card'

const HYPE = [
  'Pomagamy Twojej marce sięgać dalej. Dziś sięgamy po bingo.',
  'Kompleksowo, kreatywnie i precyzyjnie — jak zawsze w N2.',
  'Pełna obsługa marketingowa w modelu in-house. Plus bingo.',
]

export function Login({ onPick }: { onPick: (playerId: string) => void }) {
  const hype = HYPE[new Date().getDate() % HYPE.length]

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-5 py-14">
      <div className="animate-pop-in text-center">
        <div className="font-mono text-xs tracking-[0.35em] text-primary uppercase">
          N2 Media presents
        </div>
        <h1 className="mt-3 text-6xl leading-[0.95] font-extrabold tracking-tight sm:text-7xl">
          BIURO
          <br />
          <span className="text-primary">BINGO</span>
        </h1>
        <p className="text-muted-foreground mx-auto mt-5 max-w-md text-balance text-sm sm:text-base">
          {hype}
        </p>
      </div>

      <div className="mt-11">
        <div className="text-muted-foreground mb-4 text-center font-mono text-xs tracking-[0.25em] uppercase">
          Kim dziś jesteś?
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {PLAYERS.map((player, i) => (
            <button
              key={player.id}
              onClick={() => onPick(player.id)}
              className="group animate-pop-in text-left"
              style={{ animationDelay: `${80 + i * 60}ms` }}
            >
              <Card
                className="hover:border-primary/0 relative flex-row items-center gap-4 overflow-hidden p-4 transition-all duration-200 group-hover:-translate-y-0.5"
                style={{ ['--tw-ring-color' as string]: player.color }}
              >
                <span
                  className="absolute inset-x-0 top-0 h-1 opacity-70 transition-opacity group-hover:opacity-100"
                  style={{ background: player.color }}
                />
                <span
                  className="grid size-12 shrink-0 place-items-center rounded-full font-mono text-sm font-bold"
                  style={{ background: player.color, color: player.ink }}
                >
                  {player.initials}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{player.name}</span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {player.tagline}
                  </span>
                </span>
              </Card>
            </button>
          ))}
        </div>

        <p className="text-muted-foreground/70 mt-6 text-center text-xs">
          Bez haseł. Wybór zapamiętuje się w tej przeglądarce.
        </p>
      </div>
    </div>
  )
}
