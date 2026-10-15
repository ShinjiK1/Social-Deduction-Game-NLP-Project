import { useState } from 'react';
import Consent from '../components/Consent.jsx';

export default function Home({ onEnter, notice }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [consented, setConsented] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event, payload) => {
    setBusy(true);
    setError('');
    const reply = await onEnter(event, payload);
    setBusy(false);
    if (!reply.ok) setError(reply.error);
  };

  const ready = consented && name.trim() && !busy;

  return (
    <div className="stack">
      <section className="card">
        <h1>Find the larper</h1>
        <p className="muted">
          Everyone gets the same secret word except one player, the <strong>larper</strong>, who
          only knows the category. Take turns giving short hints, then vote on who's faking it.
        </p>
      </section>

      <section className="card stack">
        <label className="field">
          <span>Your name</span>
          <input
            value={name}
            maxLength={16}
            autoComplete="off"
            placeholder="e.g. Sam"
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <Consent checked={consented} onChange={setConsented} />

        {(error || notice) && <p className="error">{error || notice}</p>}

        <button type="button" disabled={!ready} onClick={() => submit('room:create', { name })}>
          Create a room
        </button>

        <div className="divider">or join one</div>

        <div className="row">
          <input
            className="code-input"
            value={code}
            maxLength={4}
            placeholder="CODE"
            autoComplete="off"
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
          />
          <button
            type="button"
            disabled={!ready || code.length !== 4}
            onClick={() => submit('room:join', { code, name })}
          >
            Join
          </button>
        </div>
      </section>
    </div>
  );
}
