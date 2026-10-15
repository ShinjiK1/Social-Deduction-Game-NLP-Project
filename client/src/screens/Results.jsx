import { useState } from 'react';
import HintBoard from '../components/HintBoard.jsx';
import PlayerList from '../components/PlayerList.jsx';
import { request } from '../socket.js';

const formatPoints = (n) => (n > 0 ? `+${n}` : `${n}`);

export default function Results({ room }) {
  const [error, setError] = useState('');
  const g = room.game;
  const nameOf = (id) => room.players.find((p) => p.id === id)?.name ?? 'Someone who left';
  const larper = nameOf(g.larperId);
  const isHost = room.meId === room.hostId;

  let headline;
  if (g.voteOutcome === 'caught') {
    headline = g.result.guessCorrect
      ? `${larper} was caught, but guessed the word for half a point!`
      : `${larper} was caught! Innocents win.`;
  } else if (g.voteOutcome === 'tie') {
    headline = `The vote tied, so ${larper} slips away! The larper wins.`;
  } else {
    headline = `${larper} got away with it! The larper wins.`;
  }

  const act = async (event) => {
    const reply = await request(event);
    setError(reply.ok ? '' : reply.error);
  };

  return (
    <div className="stack">
      <section className="card center">
        <p className="muted">The word was</p>
        <div className="role-word">{g.word}</div>
        <h2>{headline}</h2>
        {g.voteOutcome === 'caught' && (
          <p className="muted">{g.guess ? `${larper} guessed "${g.guess}".` : `${larper} ran out of time to guess.`}</p>
        )}
      </section>

      <section className="card">
        <h2>Votes</h2>
        <ul className="players">
          {g.participants.map((id) => (
            <li key={id} className={id === g.larperId ? 'larper' : ''}>
              <span>
                {nameOf(id)} → {g.votes[id] ? nameOf(g.votes[id]) : <em className="muted">no vote</em>}
              </span>
              <span className="muted small">
                {g.tally[id] ?? 0} vote(s) · {formatPoints(g.result.deltas[id])}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <HintBoard room={room} larperId={g.larperId} />
      </section>

      <section className="card">
        <h2>Scoreboard</h2>
        <PlayerList room={{ ...room, players: [...room.players].sort((a, b) => b.score - a.score) }} />
      </section>

      {error && <p className="error">{error}</p>}
      {isHost ? (
        <div className="row">
          <button type="button" onClick={() => act('room:lobby')}>
            Back to lobby
          </button>
          <button type="button" className="primary" onClick={() => act('game:start')}>
            Play again
          </button>
        </div>
      ) : (
        <p className="muted center">Waiting for the host…</p>
      )}
    </div>
  );
}
