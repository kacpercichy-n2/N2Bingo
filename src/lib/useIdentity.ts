import { useCallback, useEffect, useState } from 'react'
import { PLAYERS_BY_ID, type Player } from './players'

const STORAGE_KEY = 'n2bingo:player'

export function useIdentity() {
  const [playerId, setPlayerId] = useState<string | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored && PLAYERS_BY_ID[stored] ? stored : null
  })

  useEffect(() => {
    if (playerId) localStorage.setItem(STORAGE_KEY, playerId)
    else localStorage.removeItem(STORAGE_KEY)
  }, [playerId])

  const signOut = useCallback(() => setPlayerId(null), [])

  const player: Player | null = playerId ? (PLAYERS_BY_ID[playerId] ?? null) : null

  return { player, signIn: setPlayerId, signOut }
}
