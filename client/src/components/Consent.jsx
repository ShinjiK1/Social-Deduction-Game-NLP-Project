export default function Consent({ checked, onChange }) {
  return (
    <label className="consent">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        Hints and votes from your games are saved anonymously for a research project on
        detecting deception in text. Your name is never stored. Please don't type personal
        information in hints.
      </span>
    </label>
  );
}
