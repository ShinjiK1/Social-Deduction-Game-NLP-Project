import { useState } from 'react';
import HintBoard from '../components/HintBoard.jsx';
import { request } from '../socket.js';
import { useCountdown } from '../useCountdown.js';

export default function Game({ room }) {
  const g = room.game;
  const seconds = useCountdown(room.deadlineLocal);
  const nameOf = (id) => room.players.find((p) => p.id === id)?.name ?? 'Someone';

  let status;
  if (room.phase === 'hints') {
    status = g.currentTurnId === room.meId ? 'Your turn!' : `${nameOf(g.currentTurnId)} is thinking…`;
  } else if (room.phase === 'voting') {
    status = 'Vote for the larper';
  } else {
    status = `${nameOf(g.larperId)} was caught! They get one guess at the word…`;
  }

  return (
    <div className="stack">
      <RoleCard game={g} />

      <section className="card phase">
        <div>
          {room.phase === 'hints' && (
            <p className="muted">
              Round {g.round} of {g.rounds}
            </p>
          )}
          <h2>{status}</h2>
        </div>
        {seconds !== null && <div className={`timer ${seconds <= 5 ? 'urgent' : ''}`}>{seconds}</div>}
      </section>

      {room.phase === 'hints' && g.currentTurnId === room.meId && (
        <HintInput key={`${g.round}`} maxLength={room.limits.maxHintLength} />
      )}
      {room.phase === 'voting' && <VotePanel room={room} />}
      {room.phase === 'guess' && g.larperId === room.meId && <GuessPanel />}

      <section className="card">
        <HintBoard room={room} larperId={g.larperId} />
      </section>
    </div>
  );
}

function RoleCard({ game }) {
  if (game.role === 'spectator') {
    return (
      <section className="card role">
        <p className="muted">You're watching this game. Category: {game.category}</p>
      </section>
    );
  }
  if (game.role === 'larper') {
    return (
      <section className="card role larper">
        <p className="muted">You are the</p>
        <div className="role-word">LARPER</div>
        <p>
          Category: <strong>{game.category}</strong>. Blend in and figure out the word.
        </p>
      </section>
    );
  }
  return (
    <section className="card role">
      <p className="muted">The secret word is</p>
      <div className="role-word">{game.word}</div>
      <p className="muted">Category: {game.category}</p>
    </section>
  );
}

/** Single-line text submit used for hints and guesses. */
function TextSubmit({ event, placeholder, buttonLabel, maxLength }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    const reply = await request(event, { text });
    setBusy(false);
    if (!reply.ok) setError(reply.error);
  };

  return (
    <form className="card stack" onSubmit={submit}>
      <div className="row">
        <input
          autoFocus
          value={text}
          maxLength={maxLength}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => {
            setText(e.target.value);
            setError('');
          }}
        />
        <button type="submit" className="primary" disabled={!text.trim() || busy}>
          {buttonLabel}
        </button>
      </div>
      <div className="row spread">
        <span className="error">{error}</span>
        {maxLength && (
          <span className="muted small">
            {text.length}/{maxLength}
          </span>
        )}
      </div>
    </form>
  );
}

function HintInput({ maxLength }) {
  return <TextSubmit event="game:hint" placeholder="Your hint" buttonLabel="Submit" maxLength={maxLength} />;
}

function GuessPanel() {
  return <TextSubmit event="game:guess" placeholder="What's the word?" buttonLabel="Guess" maxLength={40} />;
}

function VotePanel({ room }) {
  const g = room.game;
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const nameOf = (id) => room.players.find((p) => p.id === id)?.name ?? 'Left';
  const inGame = g.participants.includes(room.meId);
  const remaining = g.participants.filter((id) => !g.votedIds.includes(id)).length;

  const lockIn = async () => {
    const reply = await request('game:vote', { targetId: selected });
    if (!reply.ok) setError(reply.error);
  };

  if (!inGame || g.myVote) {
    return (
      <section className="card center">
        {g.myVote && (
          <p>
            You voted for <strong>{nameOf(g.myVote)}</strong>.
          </p>
        )}
        <p className="muted">Waiting for {remaining} more vote(s)…</p>
      </section>
    );
  }

  return (
    <section className="card stack">
      <div className="vote-grid">
        {g.participants
          .filter((id) => id !== room.meId)
          .map((id) => (
            <button
              key={id}
              type="button"
              className={`vote-option ${selected === id ? 'selected' : ''}`}
              onClick={() => setSelected(id)}
            >
              {nameOf(id)}
            </button>
          ))}
      </div>
      {error && <p className="error">{error}</p>}
      <button type="button" className="primary" disabled={!selected} onClick={lockIn}>
        Lock in vote
      </button>
    </section>
  );
}
