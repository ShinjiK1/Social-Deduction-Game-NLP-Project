-- Larper game data schema. Run once in the Supabase SQL editor.
-- Players are identified only by seat number (per game) and a random anon_id (per room session).
-- No nicknames are ever stored.

create table if not exists public.games (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  rules_version         int not null,
  session_id            uuid not null, -- random per room; groups consecutive games by the same group
  started_at           timestamptz not null,
  ended_at              timestamptz not null,
  word                  text not null,
  category              text not null,
  num_players           int not null,
  num_rounds            int not null,
  hint_seconds          int not null,
  larper_seat           int not null,
  vote_outcome          text not null check (vote_outcome in ('caught', 'tie', 'missed', 'no_votes')),
  larper_guess          text,
  larper_guess_correct  boolean -- null unless the larper was caught
);

create table if not exists public.game_players (
  game_id        uuid not null references public.games (id) on delete cascade,
  seat           int not null,
  anon_id        uuid not null, -- same value across games played in one room session
  is_larper      boolean not null,
  turn_position  int not null, -- 0 = went first each round
  vote_for_seat  int, -- null = didn't vote
  score_delta    numeric(3, 1) not null,
  primary key (game_id, seat)
);

create table if not exists public.hints (
  game_id       uuid not null references public.games (id) on delete cascade,
  round         int not null, -- 1-based
  turn_index    int not null, -- 0-based position within the round
  seat          int not null,
  text          text, -- null when the player ran out of time
  timed_out     boolean not null,
  ms_to_submit  int,
  primary key (game_id, round, turn_index)
);

-- For databases created before session_id existed (safe to re-run; requires games to be empty).
alter table public.games add column if not exists session_id uuid not null;

create index if not exists games_session_id_idx on public.games (session_id);
create index if not exists game_players_anon_id_idx on public.game_players (anon_id);

-- RLS on with no policies: only the server's secret key can read or write.
alter table public.games enable row level security;
alter table public.game_players enable row level security;
alter table public.hints enable row level security;

-- Inserts one finished game atomically. Called by the server as rpc('log_game', { payload }).
create or replace function public.log_game(payload jsonb)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  new_game_id uuid;
begin
  insert into games (
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

  insert into game_players (game_id, seat, anon_id, is_larper, turn_position, vote_for_seat, score_delta)
  select new_game_id, p.seat, p.anon_id, p.is_larper, p.turn_position, p.vote_for_seat, p.score_delta
  from jsonb_to_recordset(payload -> 'players') as p (
    seat int, anon_id uuid, is_larper boolean, turn_position int, vote_for_seat int, score_delta numeric
  );

  insert into hints (game_id, round, turn_index, seat, text, timed_out, ms_to_submit)
  select new_game_id, h.round, h.turn_index, h.seat, h.text, h.timed_out, h.ms_to_submit
  from jsonb_to_recordset(payload -> 'hints') as h (
    round int, turn_index int, seat int, text text, timed_out boolean, ms_to_submit int
  );

  return new_game_id;
end;
$$;

revoke execute on function public.log_game(jsonb) from public, anon, authenticated;

-- One row per game with the hints in play order: a convenient starting point for building the training set.
drop view if exists public.game_transcripts;
create view public.game_transcripts
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
from public.games g
left join public.hints h on h.game_id = g.id
group by g.id;
