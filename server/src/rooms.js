import { randomInt, randomUUID } from 'node:crypto';
import { logGame } from './db.js';
import { cleanHint, cleanName, revealsWord, sameWord } from './text.js';
import { CATEGORIES, pickWord } from './words.js';

// Set by `npm run dev`. Lets the host send a room's games to the dev_* tables instead of the dataset.
export const DEV_MODE = process.argv.includes('--dev');

// Bump whenever a rule change would make new games incomparable with older ones in the dataset.
export const RULES_VERSION = 2; // 2: a timed-out hint submits whatever was typed

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 12;
export const MAX_HINT_LENGTH = 25;
export const MAX_NAME_LENGTH = 16;
const MAX_GUESS_LENGTH = 40;

const LOBBY_GRACE_MS = 30_000; // how long a disconnected player keeps their seat outside a game
const EMPTY_ROOM_TTL_MS = 5 * 60_000; // how long a room with nobody connected survives
const DISCONNECTED_TURN_SECONDS = 10; // shortened turn for a player who is offline when it starts

// Consonants only, so codes never spell words.
const CODE_CHARS = 'BCDFGHJKLMNPQRSTVWXZ';

export const DEFAULT_SETTINGS = { rounds: 2, hintSeconds: 45, voteSeconds: 60, guessSeconds: 30 };
export const SETTING_RANGES = {
  rounds: [1, 5],
  hintSeconds: [15, 120],
  voteSeconds: [20, 180],
  guessSeconds: [15, 90],
};

const ACTIVE_PHASES = new Set(['hints', 'voting', 'guess']);

/** An error whose message is safe to show to the player. */
export class GameError extends Error {}

function shuffle(items) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class Room {
  constructor(code, { emitTo, onEmpty }) {
    this.code = code;
    this.sessionId = randomUUID(); // logged to group games played in this room; the code itself is reused
    this.emitTo = emitTo; // (socketId, event, data) => void
    this.onEmpty = onEmpty; // called once when the room should be deleted
    this.players = new Map(); // id -> player, in join order
    this.hostId = null;
    this.settings = { ...DEFAULT_SETTINGS, categories: CATEGORIES.map((c) => c.name) };
    if (DEV_MODE) this.settings.devData = true; // local test games stay out of the real dataset by default
    this.phase = 'lobby'; // lobby | hints | voting | guess | results
    this.game = null;
    this.deadline = null;
    this.timer = null;
    this.emptyTimer = null;
    this.usedWords = new Set();
  }

  isActive() {
    return ACTIVE_PHASES.has(this.phase);
  }

  // ---------------------------------------------------------------- membership

  addPlayer(rawName, socketId) {
    if (this.isActive()) {
      throw new GameError('A game is in progress in this room. Try again when it ends.');
    }
    if (this.players.size >= MAX_PLAYERS) throw new GameError(`This room is full (max ${MAX_PLAYERS}).`);
    const name = cleanName(rawName, MAX_NAME_LENGTH);
    if (!name) throw new GameError('Please enter a name.');
    for (const p of this.players.values()) {
      if (p.name.toLowerCase() === name.toLowerCase()) throw new GameError('That name is taken in this room.');
    }
    const player = {
      id: randomUUID(), // public, shown to other clients
      token: randomUUID(), // secret, lets this client rejoin after a refresh
      anonId: randomUUID(), // logged with game data instead of the name
      name,
      socketId,
      connected: true,
      score: 0,
      removeTimer: null,
    };
    this.players.set(player.id, player);
    this.hostId ??= player.id;
    this.cancelEmptyTimer();
    this.broadcast();
    return player;
  }

  reconnect(token, socketId) {
    const player = [...this.players.values()].find((p) => p.token === token);
    if (!player) throw new GameError('Your seat in this room has expired.');
    clearTimeout(player.removeTimer);
    player.removeTimer = null;
    player.socketId = socketId;
    player.connected = true;
    this.cancelEmptyTimer();
    this.ensureHost();
    this.broadcast();
    return player;
  }

  disconnect(playerId, socketId) {
    const player = this.players.get(playerId);
    // Ignore a stale socket closing after the player already reconnected on a new one.
    if (!player || player.socketId !== socketId) return;
    player.connected = false;
    player.socketId = null;
    if (!this.isActive()) this.scheduleRemoval(player);
    this.ensureHost();
    if (this.phase === 'voting' && this.maybeFinishVoting()) return;
    if (![...this.players.values()].some((p) => p.connected)) this.startEmptyTimer();
    this.broadcast();
  }

  leave(playerId) {
    const player = this.players.get(playerId);
    if (!player) return;
    // Mid-game, keep their seat so the game record stays intact; they're removed once it ends.
    if (this.isActive() && this.game.participants.includes(playerId)) {
      this.disconnect(playerId, player.socketId);
    } else {
      this.removePlayer(playerId);
    }
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (!player) return;
    clearTimeout(player.removeTimer);
    this.players.delete(playerId);
    if (this.players.size === 0) {
      this.destroy();
      return;
    }
    this.ensureHost();
    this.broadcast();
  }

  scheduleRemoval(player) {
    clearTimeout(player.removeTimer);
    player.removeTimer = setTimeout(() => this.removePlayer(player.id), LOBBY_GRACE_MS);
  }

  ensureHost() {
    const host = this.players.get(this.hostId);
    if (host?.connected) return;
    const next = [...this.players.values()].find((p) => p.connected);
    if (next) this.hostId = next.id;
    else if (!host) this.hostId = this.players.keys().next().value ?? null;
  }

  requireHost(playerId) {
    if (playerId !== this.hostId) throw new GameError('Only the host can do that.');
  }

  startEmptyTimer() {
    this.cancelEmptyTimer();
    this.emptyTimer = setTimeout(() => this.destroy(), EMPTY_ROOM_TTL_MS);
  }

  cancelEmptyTimer() {
    clearTimeout(this.emptyTimer);
    this.emptyTimer = null;
  }

  destroy() {
    this.clearTimer();
    this.cancelEmptyTimer();
    for (const p of this.players.values()) clearTimeout(p.removeTimer);
    this.onEmpty();
  }

  // ---------------------------------------------------------------- settings

  updateSettings(playerId, patch) {
    this.requireHost(playerId);
    if (this.isActive()) throw new GameError("Settings can't change during a game.");
    if (patch?.categories !== undefined) {
      const wanted = new Set(Array.isArray(patch.categories) ? patch.categories : []);
      const categories = CATEGORIES.map((c) => c.name).filter((name) => wanted.has(name));
      if (categories.length === 0) throw new GameError('Pick at least one category.');
      this.settings.categories = categories;
    }
    if (DEV_MODE && typeof patch?.devData === 'boolean') this.settings.devData = patch.devData;
    for (const [key, [min, max]] of Object.entries(SETTING_RANGES)) {
      const value = Math.round(Number(patch?.[key]));
      if (patch?.[key] === undefined || !Number.isFinite(value)) continue;
      this.settings[key] = Math.min(max, Math.max(min, value));
    }
    this.broadcast();
  }

  backToLobby(playerId) {
    this.requireHost(playerId);
    if (this.phase !== 'results') throw new GameError('The game is not over yet.');
    this.phase = 'lobby';
    this.game = null;
    this.broadcast();
  }

  // ---------------------------------------------------------------- game flow

  startGame(playerId) {
    this.requireHost(playerId);
    if (this.isActive()) throw new GameError('A game is already running.');
    const participants = [...this.players.values()].filter((p) => p.connected).map((p) => p.id);
    if (participants.length < MIN_PLAYERS) {
      throw new GameError(`You need at least ${MIN_PLAYERS} connected players to start.`);
    }
    const { word, aliases, category } = pickWord(this.usedWords, this.settings.categories);
    this.usedWords.add(word);
    this.game = {
      participants, // seat number = index here (join order)
      anonIds: participants.map((id) => this.players.get(id).anonId),
      turnOrder: shuffle(participants),
      larperId: participants[randomInt(participants.length)],
      word,
      aliases, // other names for the word: blocked in hints, accepted as guesses
      category,
      settings: { ...this.settings },
      startedAt: new Date(),
      endedAt: null,
      round: 1,
      turnIndex: 0,
      turnStartedAt: null,
      hints: [],
      votes: {}, // voterId -> targetId
      tally: {},
      voteOutcome: null,
      guess: null,
      result: null,
    };
    this.phase = 'hints';
    this.startTurn();
  }

  currentTurnId() {
    return this.phase === 'hints' ? this.game.turnOrder[this.game.turnIndex] : null;
  }

  startTurn() {
    const g = this.game;
    const current = this.players.get(this.currentTurnId());
    const seconds = current?.connected
      ? g.settings.hintSeconds
      : Math.min(DISCONNECTED_TURN_SECONDS, g.settings.hintSeconds);
    g.turnStartedAt = Date.now();
    g.draft = '';
    this.setTimer(seconds, () => this.timeOutHint());
    this.broadcast();
  }

  submitHint(playerId, raw) {
    if (this.phase !== 'hints') throw new GameError("It's not time for hints.");
    if (playerId !== this.currentTurnId()) throw new GameError("It's not your turn.");
    const text = cleanHint(raw);
    if (!text) throw new GameError('Type a hint first.');
    if (text.length > MAX_HINT_LENGTH) throw new GameError(`Hints can be at most ${MAX_HINT_LENGTH} characters.`);
    if (this.revealsSecret(playerId, text)) throw new GameError("Your hint can't contain the secret word!");
    this.recordHint(text, false);
  }

  /** Remembers what the current player has typed so far, to submit if their time runs out. */
  saveDraft(playerId, raw) {
    if (this.phase !== 'hints' || playerId !== this.currentTurnId()) return;
    this.game.draft = cleanHint(raw).slice(0, MAX_HINT_LENGTH);
  }

  timeOutHint() {
    const text = this.game.draft;
    // A draft an innocent couldn't have submitted is dropped, the same as an empty box.
    this.recordHint(this.revealsSecret(this.currentTurnId(), text) ? '' : text, true);
  }

  // Only innocents are blocked: rejecting the larper's hint would tell them they'd found the word.
  revealsSecret(playerId, text) {
    const { larperId, word, aliases } = this.game;
    return playerId !== larperId && [word, ...aliases].some((name) => revealsWord(text, name));
  }

  /** Records the current player's hint ('' = ran out of time with nothing typed) and moves to the next turn. */
  recordHint(text, timedOut) {
    const g = this.game;
    g.hints.push({
      round: g.round,
      turnIndex: g.turnIndex,
      playerId: this.currentTurnId(),
      text,
      timedOut,
      msToSubmit: timedOut ? null : Date.now() - g.turnStartedAt,
    });
    g.turnIndex++;
    if (g.turnIndex >= g.turnOrder.length) {
      g.turnIndex = 0;
      g.round++;
    }
    if (g.round > g.settings.rounds) this.startVoting();
    else this.startTurn();
  }

  startVoting() {
    this.phase = 'voting';
    this.setTimer(this.game.settings.voteSeconds, () => this.finishVoting());
    this.broadcast();
  }

  submitVote(playerId, targetId) {
    if (this.phase !== 'voting') throw new GameError("It's not time to vote.");
    const g = this.game;
    if (!g.participants.includes(playerId)) throw new GameError("You're not in this game.");
    if (g.votes[playerId]) throw new GameError('You already voted.');
    if (targetId === playerId) throw new GameError("You can't vote for yourself.");
    if (!g.participants.includes(targetId)) throw new GameError('That player is not in this game.');
    g.votes[playerId] = targetId;
    if (!this.maybeFinishVoting()) this.broadcast();
  }

  /** Ends voting early once every connected participant has voted. */
  maybeFinishVoting() {
    const g = this.game;
    const waiting = g.participants.some((id) => !g.votes[id] && this.players.get(id)?.connected);
    if (waiting) return false;
    this.finishVoting();
    return true;
  }

  finishVoting() {
    const g = this.game;
    for (const target of Object.values(g.votes)) g.tally[target] = (g.tally[target] ?? 0) + 1;
    const top = Math.max(0, ...Object.values(g.tally));
    const leaders = Object.keys(g.tally).filter((id) => g.tally[id] === top);
    if (top === 0) g.voteOutcome = 'no_votes';
    else if (!leaders.includes(g.larperId)) g.voteOutcome = 'missed';
    else g.voteOutcome = leaders.length === 1 ? 'caught' : 'tie'; // larper wins ties

    if (g.voteOutcome === 'caught') {
      this.phase = 'guess';
      this.setTimer(g.settings.guessSeconds, () => this.finishGame());
      this.broadcast();
    } else {
      this.finishGame();
    }
  }

  submitGuess(playerId, raw) {
    if (this.phase !== 'guess') throw new GameError("It's not time to guess.");
    if (playerId !== this.game.larperId) throw new GameError('Only the larper guesses the word.');
    const text = cleanHint(raw).slice(0, MAX_GUESS_LENGTH);
    if (!text) throw new GameError('Type a guess first.');
    this.game.guess = text;
    this.finishGame();
  }

  finishGame() {
    this.clearTimer();
    const g = this.game;
    const caught = g.voteOutcome === 'caught';
    const guessCorrect =
      caught && g.guess !== null && [g.word, ...g.aliases].some((name) => sameWord(g.guess, name));
    const deltas = {};
    for (const id of g.participants) {
      if (id === g.larperId) deltas[id] = caught ? (guessCorrect ? 0.5 : 0) : 1;
      else deltas[id] = caught ? 1 : 0;
      const player = this.players.get(id);
      if (player) player.score += deltas[id];
    }
    g.result = { guessCorrect, deltas };
    g.endedAt = new Date();
    this.phase = 'results';
    for (const p of this.players.values()) if (!p.connected) this.scheduleRemoval(p);
    this.broadcast();
    logGame(this.buildRecord(), { dev: g.settings.devData === true }).catch((err) => console.error('Failed to log game:', err));
  }

  /** The anonymized record saved for the dataset. Players are identified by seat, never by name. */
  buildRecord() {
    const g = this.game;
    const seat = (id) => g.participants.indexOf(id);
    return {
      rules_version: RULES_VERSION,
      session_id: this.sessionId,
      started_at: g.startedAt.toISOString(),
      ended_at: g.endedAt.toISOString(),
      word: g.word,
      category: g.category,
      num_players: g.participants.length,
      num_rounds: g.settings.rounds,
      hint_seconds: g.settings.hintSeconds,
      larper_seat: seat(g.larperId),
      vote_outcome: g.voteOutcome,
      larper_guess: g.guess,
      larper_guess_correct: g.voteOutcome === 'caught' ? g.result.guessCorrect : null,
      players: g.participants.map((id, i) => ({
        seat: i,
        anon_id: g.anonIds[i],
        is_larper: id === g.larperId,
        turn_position: g.turnOrder.indexOf(id),
        vote_for_seat: g.votes[id] ? seat(g.votes[id]) : null,
        score_delta: g.result.deltas[id],
      })),
      hints: g.hints.map((h) => ({
        round: h.round,
        turn_index: h.turnIndex,
        seat: seat(h.playerId),
        text: h.text,
        timed_out: h.timedOut,
        ms_to_submit: h.msToSubmit,
      })),
    };
  }

  // ---------------------------------------------------------------- timers

  setTimer(seconds, onExpire) {
    this.clearTimer();
    this.deadline = Date.now() + seconds * 1000;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.deadline = null;
      try {
        onExpire();
      } catch (err) {
        console.error(`Timer error in room ${this.code}:`, err);
      }
    }, seconds * 1000);
  }

  clearTimer() {
    clearTimeout(this.timer);
    this.timer = null;
    this.deadline = null;
  }

  // ---------------------------------------------------------------- client views

  broadcast() {
    for (const p of this.players.values()) {
      if (p.connected && p.socketId) this.emitTo(p.socketId, 'room:state', this.viewFor(p.id));
    }
  }

  /** What one player is allowed to see. Hides the word from the larper and the larper from everyone. */
  viewFor(playerId) {
    const g = this.game;
    const view = {
      code: this.code,
      phase: this.phase,
      meId: playerId,
      hostId: this.hostId,
      devMode: DEV_MODE,
      settings: this.settings,
      limits: { minPlayers: MIN_PLAYERS, maxPlayers: MAX_PLAYERS, maxHintLength: MAX_HINT_LENGTH },
      categories: CATEGORIES, // every category the room can choose from, with word counts
      serverNow: Date.now(),
      deadline: this.deadline,
      players: [...this.players.values()].map((p) => ({
        id: p.id,
        name: p.name,
        connected: p.connected,
        score: p.score,
      })),
      game: null,
    };
    if (!g) return view;

    const inGame = g.participants.includes(playerId);
    const isLarper = playerId === g.larperId;
    const over = this.phase === 'results';
    const votesRevealed = this.phase === 'guess' || over;
    view.game = {
      participants: g.participants,
      turnOrder: g.turnOrder,
      rounds: g.settings.rounds,
      round: g.round,
      currentTurnId: this.currentTurnId(),
      category: g.category,
      role: !inGame ? 'spectator' : isLarper ? 'larper' : 'innocent',
      word: (inGame && !isLarper) || over ? g.word : null,
      hints: g.hints.map(({ round, playerId: author, text, timedOut }) => ({ round, playerId: author, text, timedOut })),
      votedIds: Object.keys(g.votes),
      myVote: g.votes[playerId] ?? null,
      votes: votesRevealed ? g.votes : null,
      tally: votesRevealed ? g.tally : null,
      voteOutcome: votesRevealed ? g.voteOutcome : null,
      larperId: votesRevealed ? g.larperId : null,
      guess: over ? g.guess : null,
      result: over ? g.result : null,
    };
    return view;
  }
}

export class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map();
  }

  create() {
    let code;
    do {
      code = Array.from({ length: 4 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');
    } while (this.rooms.has(code));
    const room = new Room(code, {
      emitTo: (socketId, event, data) => this.io.to(socketId).emit(event, data),
      onEmpty: () => this.rooms.delete(code),
    });
    this.rooms.set(code, room);
    return room;
  }

  get(code) {
    return this.rooms.get(String(code ?? '').trim().toUpperCase());
  }
}
