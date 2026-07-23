-- Applied to the N2Hub Supabase project. Kept here so the schema is reviewable
-- in the repo rather than living only in the dashboard.

-- DELETE events carry only the PK under REPLICA IDENTITY DEFAULT, so a
-- server-side `day=eq.` filter can never match one and the event is silently
-- dropped -- un-marking a cell stayed invisible to every other player.
alter table public.bingo_marks replica identity full;
alter table public.bingo_lines replica identity full;

create or replace function public.bingo_today()
returns date language sql stable set search_path = ''
as $$ select (now() at time zone 'Europe/Warsaw')::date $$;

alter table public.bingo_marks
  drop constraint if exists bingo_marks_sane,
  add constraint bingo_marks_sane check (
    length(phrase_id) between 1 and 64 and length(player_id) between 1 and 32
  );

alter table public.bingo_lines
  drop constraint if exists bingo_lines_sane,
  add constraint bingo_lines_sane check (
    length(line_key) between 1 and 32 and length(completed_by) between 1 and 32
  );

drop policy if exists bingo_marks_anon_all on public.bingo_marks;
drop policy if exists bingo_lines_anon_all on public.bingo_lines;

create policy bingo_marks_read on public.bingo_marks
  for select to anon, authenticated using (true);

create policy bingo_marks_insert on public.bingo_marks
  for insert to anon, authenticated
  with check (
    day = public.bingo_today()
    and player_id in ('kacper', 'jaroslaw', 'zuzanna', 'dominik')
  );

create policy bingo_marks_delete on public.bingo_marks
  for delete to anon, authenticated using (day = public.bingo_today());

create policy bingo_lines_read on public.bingo_lines
  for select to anon, authenticated using (true);

create policy bingo_lines_insert on public.bingo_lines
  for insert to anon, authenticated
  with check (
    day = public.bingo_today()
    and completed_by in ('kacper', 'jaroslaw', 'zuzanna', 'dominik')
  );

-- No UPDATE or DELETE policy on bingo_lines: a scored bingo is permanent.
