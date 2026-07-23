export type Player = {
  id: string
  name: string
  short: string
  initials: string
  /** Hex used for the mark colour, borders and glows. */
  color: string
  /** Text colour that stays readable on top of `color`. */
  ink: string
  tagline: string
}

export const PLAYERS: Player[] = [
  {
    id: 'kacper',
    name: 'Kacper Cichy',
    short: 'Kacper',
    initials: 'KC',
    color: '#ffd23f',
    ink: '#1a1500',
    tagline: 'Celuje z Nerfa. Do wszystkich.',
  },
  {
    id: 'jaroslaw',
    name: 'Jarosław Drosik',
    short: 'Jarek',
    initials: 'JD',
    color: '#4da3ff',
    ink: '#00142b',
    tagline: 'Ogarniemy po hotelu.',
  },
  {
    id: 'zuzanna',
    name: 'Zuzanna Maruda',
    short: 'Zuzia',
    initials: 'ZM',
    color: '#ff5ca8',
    ink: '#2b0018',
    tagline: 'Pojebie mnie zaraz.',
  },
  {
    id: 'dominik',
    name: 'Dominik Niewiedział',
    short: 'Dominik',
    initials: 'DN',
    color: '#48e39b',
    ink: '#002313',
    tagline: 'Więcej Bólu!!!',
  },
]

export const PLAYERS_BY_ID: Record<string, Player> = Object.fromEntries(
  PLAYERS.map((p) => [p.id, p]),
)

export function getPlayer(id: string | null | undefined): Player | undefined {
  return id ? PLAYERS_BY_ID[id] : undefined
}
