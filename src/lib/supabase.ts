import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !key) {
  throw new Error(
    'Brakuje VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — sprawdź .env lub sekrety GitHub Actions.',
  )
}

// N2Bingo is its own schema in the shared N2Hub project, next to n2click /
// clarity / blogoapp. Every `from()` below resolves inside it -- there is
// nothing of ours in `public`.
export const SCHEMA = 'n2bingo'

export const supabase = createClient(url, key, {
  auth: { persistSession: false },
  db: { schema: SCHEMA },
})

export type MarkRow = {
  id: string
  day: string
  phrase_id: string
  player_id: string
  created_at: string
}

export type LineRow = {
  id: string
  day: string
  line_key: string
  completed_by: string
  created_at: string
}
