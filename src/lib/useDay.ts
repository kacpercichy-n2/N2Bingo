import { useEffect, useState } from 'react'
import { dayKey, msUntilNextDay } from './board'

/** Current Warsaw day, self-refreshing the moment it rolls over to the next one. */
export function useDay(): string {
  const [day, setDay] = useState(() => dayKey())

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    const schedule = () => {
      timer = setTimeout(
        () => {
          setDay(dayKey())
          schedule()
        },
        // +1s of slack so we land safely inside the new day.
        msUntilNextDay() + 1000,
      )
    }
    schedule()

    // A laptop waking from sleep skips timers — re-check on focus.
    const recheck = () => setDay(dayKey())
    window.addEventListener('focus', recheck)
    document.addEventListener('visibilitychange', recheck)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('focus', recheck)
      document.removeEventListener('visibilitychange', recheck)
    }
  }, [day])

  return day
}
