# N2 Bingo

Biurowe bingo N2 Media. Codziennie nowa plansza, wspólna dla całej ekipy, reset o północy (czas warszawski).

## Jak to działa

- **Logowanie** — wchodzisz w link i klikasz, kim jesteś (Kacper / Jarek / Zuzia / Dominik). Bez haseł, wybór zostaje zapamiętany w przeglądarce.
- **Wspólna plansza** — wszyscy grają na tej samej planszy. Pole zaznaczone przez daną osobę dostaje jej kolor i inicjały. Odznaczyć może tylko ten, kto je zaznaczył.
- **Na żywo** — zaznaczenia lecą przez Supabase Realtime, więc plansza aktualizuje się u wszystkich bez odświeżania.
- **Bingo** — pełny rząd, kolumna albo przekątna odpala konfetti i zapisuje się do statystyk.
- **Reset** — każdego dnia losowany jest nowy układ pól (ten sam dla wszystkich — seedem jest data).
- **Statystyki** — ranking ekipy, najczęściej zaznaczane hasła, historia dzień po dniu, godzina pierwszego bingo.

## Stack

Vite + React + TypeScript, Tailwind CSS v4, [shadcn/ui](https://ui.shadcn.com), Supabase (Postgres + Realtime), hosting na GitHub Pages.

Font: Bricolage Grotesque + Space Mono.

## Development

```bash
npm install
npm run dev
```

Zmienne środowiskowe w `.env` (patrz `.env.example`). Klucz Supabase jest *publishable* — z założenia trafia do bundla po stronie klienta.

## Deploy

Każdy push na `main` odpala GitHub Actions i publikuje `dist/` na GitHub Pages.

## Dodawanie haseł

Wszystko siedzi w [`src/lib/phrases.ts`](src/lib/phrases.ts). Dopisz wpis z **nowym, stałym `id`** (statystyki liczą się po `id`, więc nie zmieniaj istniejących):

```ts
{ id: 'nowe-haslo', text: 'Nowe hasło' },
```

Przy 24+ hasłach plansza sama przechodzi z 4×4 na klasyczne 5×5 z wolnym polem na środku.

## Baza

Dwie tabele w projekcie Supabase `N2Hub`:

- `bingo_marks` — `(day, phrase_id)` unikalne, plus `player_id`
- `bingo_lines` — `(day, line_key)` unikalne, plus `completed_by`

Obie z RLS i policy dla `anon` — wewnętrzna zabawka, kto ma link, ten gra.
