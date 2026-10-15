import { useState } from 'react';
import Consent from '../components/Consent.jsx';

// Landing page for invite links (/?room=CODE): the room is already chosen, so only a name is needed.
export default function Invite({ code, onEnter, onDismiss, notice }) {
  const [name, setName] = useState('');
  const [consented, setConsented] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const ready = consented && name.trim() && !busy;

  const join = async (event) => {
    event.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError('');
    const reply = await onEnter('room:join', { code, name });
    setBusy(false);
    if (!reply.ok) setError(reply.error);
  };

  return (
    <form className="stack" onSubmit={join}>
      <section className="card center">
        <p className="muted">You've been invited to room</p>
        <div className="big-code">{code}</div>
      </section>

      <section className="card stack">
        <label className="field">
          <span>Your name</span>
          <input
            value={name}
            maxLength={16}
            autoComplete="off"
            autoFocus
            placeholder="e.g. Sam"
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <Consent checked={consented} onChange={setConsented} />

        {(error || notice) && <p className="error">{error || notice}</p>}

        <button type="submit" disabled={!ready}>
          Join room
        </button>
        <button type="button" className="link" onClick={onDismiss}>
          Create or join a different room
        </button>
      </section>
    </form>
  );
}
