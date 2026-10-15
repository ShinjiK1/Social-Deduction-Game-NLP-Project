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

      <CategoryPicker room={room} isHost={isHost} onError={setError} />

      {room.devMode && <DevDataToggle room={room} isHost={isHost} />}

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

function CategoryPicker({ room, isHost, onError }) {
  const enabled = new Set(room.settings.categories);
  const allNames = room.categories.map((c) => c.name);
  const wordCount = room.categories.filter((c) => enabled.has(c.name)).reduce((sum, c) => sum + c.count, 0);

  const save = async (categories) => {
    const reply = await request('room:settings', { settings: { categories } });
    onError(reply.ok ? '' : reply.error);
  };

  const toggle = (name) => {
    const next = enabled.has(name) ? [...enabled].filter((c) => c !== name) : [...enabled, name];
    save(next);
  };

  return (
    <section className="card stack">
      <div className="row spread">
        <h2>Categories</h2>
        {isHost && enabled.size < allNames.length && (
          <button type="button" className="link" onClick={() => save(allNames)}>
            Select all
          </button>
        )}
      </div>
      <p className="muted small">
        {enabled.size} of {allNames.length} categories · {wordCount} words
      </p>
      <div className="category-grid">
        {room.categories.map((c) => {
          const checked = enabled.has(c.name);
          return (
            <label key={c.name} className={`category ${checked ? 'on' : ''}`}>
              <input
                type="checkbox"
                checked={checked}
                // Keep at least one category selected; the server enforces this too.
                disabled={!isHost || (checked && enabled.size === 1)}
                onChange={() => toggle(c.name)}
              />
              <span>{c.name}</span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

// Only shown when the server runs with `npm run dev`; the server ignores this setting otherwise.
function DevDataToggle({ room, isHost }) {
  const on = room.settings.devData;
  return (
    <section className="card stack">
      <label className="field inline">
        <span>Save to dev tables</span>
        <input
          type="checkbox"
          checked={on}
          disabled={!isHost}
          onChange={(e) => request('room:settings', { settings: { devData: e.target.checked } })}
        />
      </label>
      <p className="muted small">
        Dev server only. {on ? 'Games are saved to dev_games, dev_game_players and dev_hints.' : 'Games are saved to the real dataset.'}
      </p>
    </section>
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
