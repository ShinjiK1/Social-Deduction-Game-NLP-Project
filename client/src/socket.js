import { io } from 'socket.io-client';

export const socket = io();

/** Emits an event and resolves with the server's { ok, ... } reply. */
export function request(event, payload = {}) {
  return new Promise((resolve) => {
    socket.timeout(5000).emit(event, payload, (err, reply) => {
      resolve(err ? { ok: false, error: 'The server did not respond. Check your connection.' } : reply);
    });
  });
}

// sessionStorage (not localStorage) so each browser tab can be a separate player while testing.
const SESSION_KEY = 'larper-session';

export function loadSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export function saveSession(session) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Storage unavailable (private mode); rejoining after a refresh just won't work.
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
