import { useCallback, useEffect, useState } from 'react'
import { PLAYERS_BY_ID, type Player } from './players'

const STORAGE_KEY = 'n2bingo:player'

// Storage is unavailable when site data is blocked; the game still works, it
// just asks who you are on every visit. Never let it blank the whole app.
function readStored(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored && PLAYERS_BY_ID[stored] ? stored : null
  } catch {
    return null
  }
}

export function useIdentity() {
  const [playerId, setPlayerId] = useState<string | null>(readStored)

  useEffect(() => {
    try {
      if (playerId) localStorage.setItem(STORAGE_KEY, playerId)
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore — the choice simply won't persist */
    }
  }, [playerId])

  const signOut = useCallback(() => setPlayerId(null), [])

  const player: Player | null = playerId ? (PLAYERS_BY_ID[playerId] ?? null) : null

  return { player, signIn: setPlayerId, signOut }
}
