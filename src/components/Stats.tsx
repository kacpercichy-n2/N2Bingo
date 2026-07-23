import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { dayStart, prettyDay, TIMEZONE } from '@/lib/board'
import { PHRASES_BY_ID } from '@/lib/phrases'
import { getPlayer, PLAYERS } from '@/lib/players'
import { useStats } from '@/lib/useStats'

const timeFormatter = new Intl.DateTimeFormat('pl-PL', {
  timeZone: TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
})

function StatTile({ value, label, hint }: { value: string; label: string; hint?: string }) {
  return (
    <Card className="gap-1 py-5">
      <CardContent className="px-5">
        <div className="text-primary text-3xl font-extrabold tabular-nums sm:text-4xl">{value}</div>
        <div className="text-muted-foreground mt-1 font-mono text-[10px] tracking-[0.18em] uppercase">
          {label}
        </div>
        {hint && <div className="text-muted-foreground/70 mt-1 text-xs">{hint}</div>}
      </CardContent>
    </Card>
  )
}

export function Stats({ today, liveKey }: { today: string; liveKey?: string }) {
  const { marks, lines, loading, error } = useStats(today, liveKey)

  const data = useMemo(() => {
    const byPlayer = new Map<string, { marks: number; bingos: number; days: Set<string> }>()
    for (const p of PLAYERS) byPlayer.set(p.id, { marks: 0, bingos: 0, days: new Set() })

    const bump = (id: string) => {
      if (!byPlayer.has(id)) byPlayer.set(id, { marks: 0, bingos: 0, days: new Set() })
      return byPlayer.get(id)!
    }

    for (const m of marks) {
      const entry = bump(m.player_id)
      entry.marks++
      entry.days.add(m.day)
    }
    for (const l of lines) bump(l.completed_by).bingos++

    const byPhrase = new Map<string, { count: number; last: string }>()
    for (const m of marks) {
      const entry = byPhrase.get(m.phrase_id) ?? { count: 0, last: m.day }
      entry.count++
      if (m.day > entry.last) entry.last = m.day
      byPhrase.set(m.phrase_id, entry)
    }

    const topPhrases = [...byPhrase.entries()]
      .map(([id, v]) => ({
        id,
        text: PHRASES_BY_ID[id]?.text ?? id,
        count: v.count,
        last: v.last,
      }))
      .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text))

    const daySet = new Set<string>([...marks.map((m) => m.day), ...lines.map((l) => l.day)])
    const days = [...daySet].sort((a, b) => b.localeCompare(a))

    const byDay = days.map((day) => {
      const dayMarks = marks.filter((m) => m.day === day)
      const dayLines = lines.filter((l) => l.day === day)
      const firstBingo = dayLines[0]
      return {
        day,
        marks: dayMarks.length,
        bingos: dayLines.length,
        firstBingoAt: firstBingo ? new Date(firstBingo.created_at) : null,
        firstBingoBy: firstBingo?.completed_by ?? null,
      }
    })

    // Elapsed time is measured from Warsaw midnight, not UTC — otherwise a
    // summer day (UTC+2) looks an hour slower than a winter one (UTC+1).
    const elapsed = (d: (typeof byDay)[number]) =>
      d.firstBingoAt ? d.firstBingoAt.getTime() - dayStart(d.day).getTime() : Infinity

    const daysWithBingo = byDay.filter((d) => d.bingos > 0)
    const fastest = daysWithBingo.reduce<(typeof byDay)[number] | null>(
      (best, d) => (!best || elapsed(d) < elapsed(best) ? d : best),
      null,
    )

    const ranking = PLAYERS.map((p) => ({ player: p, ...byPlayer.get(p.id)! })).sort(
      (a, b) => b.marks - a.marks || b.bingos - a.bingos,
    )

    const todayMarks = marks.filter((m) => m.day === today)
    const todayLines = lines.filter((l) => l.day === today)

    return {
      ranking,
      topPhrases,
      byDay,
      fastest,
      totalDays: days.length,
      daysWithBingo: daysWithBingo.length,
      todayMarks: todayMarks.length,
      todayBingos: todayLines.length,
      totalBingos: lines.length,
    }
  }, [marks, lines, today])

  if (loading) {
    return <div className="text-muted-foreground py-16 text-center text-sm">Liczę…</div>
  }
  if (error) {
    return <div className="text-destructive py-16 text-center text-sm">{error}</div>
  }
  if (marks.length === 0) {
    return (
      <div className="text-muted-foreground py-16 text-center text-sm">
        Jeszcze nikt nic nie zaznaczył. Wróć, jak Kamil przyjdzie po 12.
      </div>
    )
  }

  const maxPhraseCount = data.topPhrases[0]?.count ?? 1

  return (
    <div className="animate-pop-in space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile value={String(data.todayMarks)} label="Zaznaczeń dziś" />
        <StatTile value={String(data.todayBingos)} label="Bingo dziś" />
        <StatTile
          value={String(data.totalBingos)}
          label="Bingo łącznie"
          hint={`w ${data.daysWithBingo} z ${data.totalDays} dni`}
        />
        <StatTile
          value={data.fastest?.firstBingoAt ? timeFormatter.format(data.fastest.firstBingoAt) : '—'}
          label="Najszybsze bingo"
          hint={data.fastest ? prettyDay(data.fastest.day) : 'jeszcze żadnego'}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ranking ekipy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.ranking.map((row, i) => {
            const max = data.ranking[0]?.marks || 1
            return (
              <div key={row.player.id} className="flex items-center gap-3">
                <span className="text-muted-foreground w-5 shrink-0 font-mono text-xs">
                  {i + 1}.
                </span>
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-full font-mono text-[11px] font-bold"
                  style={{ background: row.player.color, color: row.player.ink }}
                >
                  {row.player.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{row.player.short}</span>
                    <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
                      {row.marks} zazn. · {row.bingos} bingo
                    </span>
                  </div>
                  <div className="bg-muted mt-1.5 h-1.5 overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(row.marks / max) * 100}%`,
                        background: row.player.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Najczęściej zaznaczane hasła</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {data.topPhrases.slice(0, 12).map((p, i) => (
            <div key={p.id} className="flex items-center gap-3">
              <span className="text-muted-foreground w-5 shrink-0 font-mono text-xs">{i + 1}.</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm">{p.text}</span>
                  <span className="text-primary shrink-0 font-mono text-xs font-bold tabular-nums">
                    ×{p.count}
                  </span>
                </div>
                <div className="bg-muted mt-1.5 h-1.5 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{ width: `${(p.count / maxPhraseCount) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dzień po dniu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dzień</TableHead>
                  <TableHead className="text-right">Zazn.</TableHead>
                  <TableHead className="text-right">Bingo</TableHead>
                  <TableHead className="text-right">1. bingo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.byDay.slice(0, 30).map((d) => {
                  const by = getPlayer(d.firstBingoBy)
                  return (
                    <TableRow key={d.day}>
                      <TableCell className="whitespace-nowrap">
                        {prettyDay(d.day)}
                        {d.day === today && (
                          <span className="text-primary ml-2 font-mono text-[10px] uppercase">
                            dziś
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{d.marks}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {d.bingos || '—'}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {d.firstBingoAt ? (
                          <span className="font-mono text-xs tabular-nums">
                            {timeFormatter.format(d.firstBingoAt)}
                            {by && (
                              <span className="ml-1.5 font-bold" style={{ color: by.color }}>
                                {by.initials}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
