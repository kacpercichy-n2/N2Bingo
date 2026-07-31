-- Applied to the N2Hub Supabase project.
--
-- The project was reorganised into one schema per sub-project (n2click, clarity,
-- blogoapp, ...), with shared identity in `core` and RLS helpers in `app`. The
-- bingo tables came along with the n2click move and ended up as a guest in
-- someone else's schema, while the app still pointed at `public` -- which is no
-- longer exposed through the API at all. This gives N2Bingo its own schema.

create schema if not exists n2bingo;

grant usage on schema n2bingo to anon, authenticated, service_role;

-- Move, don't recreate: the rows are the game history and must survive. The RLS
-- policies follow the tables and re-point at the function by oid, so
-- `bingo_today()` keeps working under its new name without touching them.
alter table n2click.bingo_marks set schema n2bingo;
alter table n2click.bingo_lines set schema n2bingo;
alter function n2click.bingo_today() set schema n2bingo;

-- Grants travelled with the tables, including the `public`-schema defaults that
-- handed anon TRUNCATE / UPDATE / REFERENCES. RLS does not gate TRUNCATE, so a
-- holder of the publishable key could wipe the history the policies otherwise
-- make permanent. Reset to exactly what the client needs.
revoke all on n2bingo.bingo_marks from anon, authenticated;
revoke all on n2bingo.bingo_lines from anon, authenticated;

grant select, insert, delete on n2bingo.bingo_marks to anon, authenticated;
grant select, insert on n2bingo.bingo_lines to anon, authenticated;

alter default privileges in schema n2bingo grant select on tables to anon, authenticated;

-- Not expressible in SQL: `n2bingo` must be listed under
-- Dashboard -> Settings -> API -> Exposed schemas, or PostgREST answers 406.
