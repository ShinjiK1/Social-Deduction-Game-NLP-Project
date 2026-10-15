/** Grid of hints: one row per player in turn order, one column per round. */
export default function HintBoard({ room, larperId = null }) {
  const g = room.game;
  const nameOf = (id) => room.players.find((p) => p.id === id)?.name ?? 'Left';
  const rounds = Array.from({ length: g.rounds }, (_, i) => i + 1);

  return (
    <div className="board-wrap">
      <table className="board">
        <thead>
          <tr>
            <th />
            {rounds.map((r) => (
              <th key={r}>Round {r}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {g.turnOrder.map((id) => (
            <tr
              key={id}
              className={[id === g.currentTurnId && 'current', id === larperId && 'larper'].filter(Boolean).join(' ')}
            >
              <th scope="row">
                {nameOf(id)}
                {id === room.meId && <span className="tag">you</span>}
              </th>
              {rounds.map((r) => {
                const hint = g.hints.find((h) => h.round === r && h.playerId === id);
                if (!hint) {
                  const typing = id === g.currentTurnId && r === g.round;
                  return <td key={r} className="pending">{typing ? 'typing…' : ''}</td>;
                }
                return (
                  <td key={r} className={hint.timedOut ? 'pending' : ''}>
                    {hint.timedOut ? '(no hint)' : hint.text}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
