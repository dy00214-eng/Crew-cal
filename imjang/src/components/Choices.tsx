export interface Choice<T extends string> {
  value: T;
  label: string;
}

export default function Choices<T extends string>({
  value,
  choices,
  onChange,
  label,
}: {
  value: T;
  choices: readonly Choice<T>[];
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    <div className="choices" role="group" aria-label={label}>
      {choices.map((c) => (
        <button
          key={c.value}
          type="button"
          className="choice"
          aria-pressed={value === c.value}
          onClick={() => onChange(c.value)}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
