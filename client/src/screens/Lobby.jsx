import { useState } from 'react';
import PlayerList from '../components/PlayerList.jsx';
import { request } from '../socket.js';

const ROUND_OPTIONS = [1, 2, 3, 4, 5];
const HINT_OPTIONS = [20, 30, 45, 60, 90];
const VOTE_OPTIONS = [30, 45, 60, 90, 120];

export default function Lobby({ room }) {
  const [error, setError] = useState('');
  const isHost = room.meId === room.hostId;
  const connectedCount = room.players.filter((p) => p.connected).length;
  const canStart = connectedCount >= room.limits.minPlayers;
  const joinLink = `${window.location.origin}/?room=${room.code}`;

  const changeSetting = (key) => (e) => request('room:settings', { settings: { [key]: Number(e.target.value) } });

  const start = async () => {
    const reply = await request('game:start');
    setError(reply.ok ? '' : reply.error);
  };

  return (
    <div className="stack">
      <section className="card center">
        <p className="muted">Join at {window.location.host} with code</p>
        <div className="big-code">{room.code}</div>
        <button type="button" className="link" onClick={() => navigator.clipboard?.writeText(joinLink)}>
          Copy invite link
        </button>
      </section>

      <section className="card">
        <h2>
          Players ({room.players.length}/{room.limits.maxPlayers})
        </h2>
        <PlayerList room={room} />
      </section>

      <section className="card stack">
        <h2>Settings</h2>
        <SettingSelect label="Rounds of hints" value={room.settings.rounds} options={ROUND_OPTIONS}
          disabled={!isHost} onChange={changeSetting('rounds')} />
        <SettingSelect label="Seconds per hint" value={room.settings.hintSeconds} options={HINT_OPTIONS}
          disabled={!isHost} onChange={changeSetting('hintSeconds')} />
        <SettingSelect label="Seconds to vote" value={room.settings.voteSeconds} options={VOTE_OPTIONS}
          disabled={!isHost} onChange={changeSetting('voteSeconds')} />
      </section>

      {error && <p className="error">{error}</p>}
      {isHost ? (
        <button type="button" className="primary" disabled={!canStart} onClick={start}>
          {canStart ? 'Start game' : `Need ${room.limits.minPlayers - connectedCount} more player(s)`}
        </button>
      ) : (
        <p className="muted center">Waiting for the host to start…</p>
      )}
    </div>
  );
}

function SettingSelect({ label, value, options, disabled, onChange }) {
  const all = options.includes(value) ? options : [...options, value].sort((a, b) => a - b);
  return (
    <label className="field inline">
      <span>{label}</span>
      <select value={value} disabled={disabled} onChange={onChange}>
        {all.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
