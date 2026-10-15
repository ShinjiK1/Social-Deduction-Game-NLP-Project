import express from 'express';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { GameError, MAX_NAME_LENGTH, RoomManager } from './rooms.js';
import { cleanName } from './text.js';

const PORT = Number(process.env.PORT ?? 3001);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const rooms = new RoomManager(io);

app.get('/health', (_req, res) => res.json({ ok: true, rooms: rooms.rooms.size }));

// In production, serve the built client from the same origin.
const clientDist = fileURLToPath(new URL('../../client/dist/', import.meta.url));
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((_req, res) => res.sendFile(`${clientDist}index.html`));
}

io.on('connection', (socket) => {
  /** Registers a handler that replies through the ack callback with { ok, ...result } or { ok: false, error }. */
  const handle = (event, fn) =>
    socket.on(event, (payload, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      try {
        reply({ ok: true, ...fn(payload ?? {}) });
      } catch (err) {
        if (err instanceof GameError) {
          reply({ ok: false, error: err.message });
        } else {
          console.error(`Error handling ${event}:`, err);
          reply({ ok: false, error: 'Something went wrong.' });
        }
      }
    });

  const current = () => {
    const room = rooms.get(socket.data.roomCode);
    const playerId = socket.data.playerId;
    if (!room || !room.players.has(playerId)) throw new GameError("You're not in a room.");
    return { room, playerId };
  };

  const leaveCurrent = () => {
    rooms.get(socket.data.roomCode)?.leave(socket.data.playerId);
    socket.data = {};
  };

  const attach = (room, player) => {
    socket.data = { roomCode: room.code, playerId: player.id };
    return { code: room.code, token: player.token, playerId: player.id };
  };

  handle('room:create', ({ name }) => {
    if (!cleanName(name, MAX_NAME_LENGTH)) throw new GameError('Please enter a name.');
    leaveCurrent();
    const room = rooms.create();
    return attach(room, room.addPlayer(name, socket.id));
  });

  handle('room:join', ({ code, name }) => {
    const room = rooms.get(code);
    if (!room) throw new GameError('No room with that code.');
    leaveCurrent();
    return attach(room, room.addPlayer(name, socket.id));
  });

  handle('room:rejoin', ({ code, token }) => {
    const room = rooms.get(code);
    if (!room) throw new GameError('That room no longer exists.');
    return attach(room, room.reconnect(token, socket.id));
  });

  handle('room:leave', () => {
    leaveCurrent();
  });

  handle('room:settings', ({ settings }) => {
    const { room, playerId } = current();
    room.updateSettings(playerId, settings);
  });

  handle('room:lobby', () => {
    const { room, playerId } = current();
    room.backToLobby(playerId);
  });

  handle('game:start', () => {
    const { room, playerId } = current();
    room.startGame(playerId);
  });

  handle('game:hint', ({ text }) => {
    const { room, playerId } = current();
    room.submitHint(playerId, text);
  });

  handle('game:hintDraft', ({ text }) => {
    const { room, playerId } = current();
    room.saveDraft(playerId, text);
  });

  handle('game:vote', ({ targetId }) => {
    const { room, playerId } = current();
    room.submitVote(playerId, targetId);
  });

  handle('game:guess', ({ text }) => {
    const { room, playerId } = current();
    room.submitGuess(playerId, text);
  });

  socket.on('disconnect', () => {
    rooms.get(socket.data.roomCode)?.disconnect(socket.data.playerId, socket.id);
  });
});

httpServer.listen(PORT, () => console.log(`Catch The Larper server listening on http://localhost:${PORT}`));
