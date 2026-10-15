-- Dev copies of the game tables, for games played against `npm run dev` with "Save to dev tables" on.
-- Run once in the Supabase SQL editor, after schema.sql (the tables copy their columns from it).

create table if not exists public.dev_games (like public.games including all);

create table if not exists public.dev_game_players (
  like public.game_players including all,
  foreign key (game_id) references public.dev_games (id) on delete cascade
);

create table if not exists public.dev_hints (
  like public.hints including all,
  foreign key (game_id) references public.dev_games (id) on delete cascade
);

-- RLS on with no policies: only the server's secret key can read or write.
alter table public.dev_games enable row level security;
alter table public.dev_game_players enable row level security;
alter table public.dev_hints enable row level security;

-- Same as log_game, but into the dev_* tables. Called by the server as rpc('log_dev_game', { payload }).
create or replace function public.log_dev_game(payload jsonb)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  new_game_id uuid;
begin
  insert into dev_games (
    rules_version, session_id, started_at, ended_at, word, category, num_players, num_rounds,
    hint_seconds, larper_seat, vote_outcome, larper_guess, larper_guess_correct
  )
  values (
    (payload ->> 'rules_version')::int,
    (payload ->> 'session_id')::uuid,
    (payload ->> 'started_at')::timestamptz,
    (payload ->> 'ended_at')::timestamptz,
    payload ->> 'word',
    payload ->> 'category',
    (payload ->> 'num_players')::int,
    (payload ->> 'num_rounds')::int,
    (payload ->> 'hint_seconds')::int,
    (payload ->> 'larper_seat')::int,
    payload ->> 'vote_outcome',
    payload ->> 'larper_guess',
    (payload ->> 'larper_guess_correct')::boolean
  )
  returning id into new_game_id;

  insert into dev_game_players (game_id, seat, anon_id, is_larper, turn_position, vote_for_seat, score_delta)
  select new_game_id, p.seat, p.anon_id, p.is_larper, p.turn_position, p.vote_for_seat, p.score_delta
  from jsonb_to_recordset(payload -> 'players') as p (
    seat int, anon_id uuid, is_larper boolean, turn_position int, vote_for_seat int, score_delta numeric
  );

  insert into dev_hints (game_id, round, turn_index, seat, text, timed_out, ms_to_submit)
  select new_game_id, h.round, h.turn_index, h.seat, h.text, h.timed_out, h.ms_to_submit
  from jsonb_to_recordset(payload -> 'hints') as h (
    round int, turn_index int, seat int, text text, timed_out boolean, ms_to_submit int
  );

  return new_game_id;
end;
$$;

revoke execute on function public.log_dev_game(jsonb) from public, anon, authenticated;

drop view if exists public.dev_game_transcripts;
create view public.dev_game_transcripts
with (security_invoker = true) as
select
  g.id as game_id,
  g.rules_version,
  g.session_id,
  g.started_at,
  g.word,
  g.category,
  g.num_players,
  g.larper_seat,
  g.vote_outcome,
  coalesce(
    jsonb_agg(
      jsonb_build_object('round', h.round, 'seat', h.seat, 'text', h.text)
      order by h.round, h.turn_index
    ) filter (where h.game_id is not null),
    '[]'::jsonb
  ) as hints
from public.dev_games g
left join public.dev_hints h on h.game_id = g.id
group by g.id;
