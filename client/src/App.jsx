import { useEffect, useState } from 'react';
import Game from './screens/Game.jsx';
import Home from './screens/Home.jsx';
import Lobby from './screens/Lobby.jsx';
import Results from './screens/Results.jsx';
import { clearSession, loadSession, request, saveSession, socket } from './socket.js';

export default function App() {
  const [room, setRoom] = useState(null);
  const [connected, setConnected] = useState(socket.connected);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const onState = (state) => {
      // Convert the server deadline to the local clock so countdowns ignore clock skew.
      const deadlineLocal = state.deadline ? Date.now() + (state.deadline - state.serverNow) : null;
      setRoom({ ...state, deadlineLocal });
    };
    const onConnect = async () => {
      setConnected(true);
      const session = loadSession();
      if (!session) return;
      const reply = await request('room:rejoin', session);
      if (!reply.ok) {
        clearSession();
        setRoom(null);
        setNotice(reply.error);
      }
    };
    const onDisconnect = () => setConnected(false);

    socket.on('room:state', onState);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) onConnect();
    return () => {
      socket.off('room:state', onState);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  const enter = async (event, payload) => {
    const reply = await request(event, payload);
    if (reply.ok) {
      saveSession({ code: reply.code, token: reply.token });
      setNotice('');
    }
    return reply;
  };

  const leave = async () => {
    await request('room:leave');
    clearSession();
    setRoom(null);
  };

  let screen;
  if (!room) screen = <Home onEnter={enter} notice={notice} />;
  else if (room.phase === 'lobby') screen = <Lobby room={room} />;
  else if (room.phase === 'results') screen = <Results room={room} />;
  else screen = <Game room={room} />;

  return (
    <div className="app">
      <header className="topbar">
        <span className="logo">Catch The Larper</span>
        {room && <span className="room-code">Room {room.code}</span>}
        <span className={`status ${connected ? 'online' : 'offline'}`}>
          {connected ? 'Connected' : 'Reconnecting…'}
        </span>
        {room && (
          <button type="button" className="link" onClick={leave}>
            Leave
          </button>
        )}
      </header>
      <main>{screen}</main>
    </div>
  );
}
