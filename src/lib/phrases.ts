export type Phrase = {
  /** Stable id — stats are aggregated on this, so never change an existing one. */
  id: string
  text: string
}

/**
 * The office pool. Add entries freely: once there are 24+ the board
 * automatically grows from 4×4 to a classic 5×5 with a free centre.
 */
export const PHRASES: Phrase[] = [
  { id: 'kamil-12', text: 'Kamil po 12' },
  { id: 'kamil-15', text: 'Kamil po 15' },
  { id: 'kamil-17', text: 'Kamil po 17' },
  { id: 'kamil-wkurwiony', text: 'Kamil od rana wkurwiony (na UEP, na Krzysia, na życie)' },
  { id: 'zuzia-pojebie', text: 'Pojebie mnie zaraz — Zuzia' },
  { id: 'krzysiowy-bipolar', text: 'Krzysiowy BiPolar' },
  { id: 'chaos-w-biurze', text: 'Chaos w biurze' },
  { id: 'musimy-sie-uspokoic', text: 'Musimy się wszyscy uspokoić' },
  { id: 'pieniedzy-nie-ma', text: 'Pieniędzy nie ma i nie będzie' },
  { id: 'pieski-w-biurze', text: 'Pieski w biurze ❤️' },
  { id: 'wicia-autorytet', text: 'Wicia mówi, że nie ma autorytetu' },
  { id: 'cichy-nerf', text: 'Cichy celuje do wszystkich z Nerfa' },
  { id: 'obrzydliwe-bolero', text: 'Obrzydliwe Bolero' },
  { id: 'wiecej-bolu', text: 'Więcej Bólu!!!' },
  { id: 'seba-historia', text: 'Seba opowiadający historię życia' },
  { id: 'rekrutacja-widmo', text: 'Rozmowa rekrutacyjna — człowiek widmo' },
  { id: 'prezes-sabotuje', text: 'Prezes sabotuje montaż' },
  { id: 'przypadkowy-remont', text: 'Przypadkowy remont / przemeblowanie' },
  { id: 'opozniona-produkcja', text: 'Opóźniona produkcja' },
  { id: 'montaz-o-msc', text: 'Montaż opóźniony o msc' },
  { id: 'uwu-na-spotkaniu', text: 'UwU na spotkaniu' },
  { id: 'ogarniemy-po-hotelu', text: 'Ogarniemy po hotelu' },
  { id: 'glupi-pomysl', text: '„Mam głupi pomysł”' },
  { id: 'przetarg-z-pizdy', text: 'Przetarg z pizdy — nie wiadomo o chuj chodzi?' },
]

export const PHRASES_BY_ID: Record<string, Phrase> = Object.fromEntries(
  PHRASES.map((p) => [p.id, p]),
)

export const FREE_CELL: Phrase = { id: '__free__', text: 'N2' }
