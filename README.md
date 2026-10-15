# Catch The Larper

An online social deduction game used to collect hint data for training an imposter classifier.
Every player gets the same secret word except the **larper**, who only sees the category. Players
take turns giving short hints (25 characters max), then vote on who the larper is.

## Rules and scoring

- 3–12 players (3-6 recommended). The turn order is shuffled once per game and kept for every round. The number of rounds can be set from 1 to 5.
- The host picks which word categories are in play (all of them by default, at least one).
- An innocent's hint can't contain the secret word. The larper's hints are never rejected, because a rejection would tell them they had hit the word (although the innocents would then know who the larper is from this anyways).
- Voting: you can't vote for yourself, and votes can't be changed once locked in.
- The larper is **caught** only if they alone have the most votes. **The larper wins ties.**
  - Caught: each innocent gets +1, and the larper gets one guess at the word (+0.5 if correct).
  - Not caught: the larper gets +1.

## Running locally

```bash
npm install
npm run dev   # server on :3001, client on http://localhost:5173 (also reachable on your LAN)
```

Open several browser tabs to play as several players. Each tab is its own player.
If you refresh a page, you go back to the same seat.

## Supabase setup

1. Create a Supabase project and run `supabase/schema.sql` in its SQL editor.
2. Copy `server/.env.example` to `server/.env`, then set `SUPABASE_URL` and `SUPABASE_SECRET_KEY`
   (Project Settings → API keys → secret key). Only the server uses this key.

If Supabase isn't configured or an insert fails, finished games are appended to
`server/data/games.jsonl`, so no data is lost.

### Dev tables

When the server runs with `npm run dev`, the lobby shows a **Save to dev tables** toggle (on by
default, host-only). While it's on, that room's games go to `dev_games`, `dev_game_players` and
`dev_hints` (plus the `dev_game_transcripts` view) instead of the real dataset, or to
`server/data/games.dev.jsonl` as the fallback. Run `supabase/dev_schema.sql` once, after
`schema.sql`, to create them. `npm start` never shows the toggle and always logs to the real tables.

## Data collected

Nicknames are never stored. Each finished game is written to three tables:

| Table | Contents |
|---|---|
| `games` | `session_id` (one per room, shared by all of that room's games), word, category, settings, `larper_seat`, `vote_outcome` (`caught` / `tie` / `missed` / `no_votes`), the larper's guess |
| `game_players` | one row per seat: `is_larper`, `turn_position`, `vote_for_seat`, `score_delta`, `anon_id` |
| `hints` | `round`, `turn_index`, `seat`, `text`, `timed_out`, `ms_to_submit` (null if timed out). On a timeout, `text` is whatever was in the box, or `''` if it was empty (null before `rules_version` 2) |

`anon_id` stays the same for one player across all games in a room session. Use it to keep the
same people out of both the train and test sets. The `game_transcripts` view gives one row per
game with its hints in play order. If a rule change makes new games incomparable with older ones,
bump `RULES_VERSION` in `server/src/rooms.js`.

## Layout

```
server/src/index.js   Socket.IO event handlers and the static file server
server/src/rooms.js   room and game state machine, per-player views, building the logged record
server/src/text.js    hint and guess cleanup and word matching
server/src/words.js   word list (15 categories, ~640 words) with alternate names blocked in hints
server/src/db.js      Supabase logging with a local file fallback
client/src/           React app (Home → Lobby → Game → Results)
supabase/schema.sql   tables, the log_game RPC, and the transcripts view
supabase/dev_schema.sql  dev_* copies of the tables, the log_dev_game RPC, and its transcripts view
```
