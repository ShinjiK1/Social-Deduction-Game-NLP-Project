export default function PlayerList({ room }) {
  return (
    <ul className="players">
      {room.players.map((p) => (
        <li key={p.id} className={p.connected ? '' : 'away'}>
          <span>
            {p.name}
            {p.id === room.meId && <span className="tag">you</span>}
            {p.id === room.hostId && <span className="tag">host</span>}
            {!p.connected && <span className="tag">away</span>}
          </span>
          <span className="score">{p.score}</span>
        </li>
      ))}
    </ul>
  );
}
