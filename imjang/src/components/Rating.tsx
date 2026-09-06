/** 1~5 평점 한 줄. 같은 값을 다시 누르면 평가 해제. */
export default function Rating({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value?: number;
  onChange: (next: number | undefined) => void;
}) {
  return (
    <div className="rate">
      <span>
        {label}
        {hint && (
          <>
            <br />
            <small className="hint">{hint}</small>
          </>
        )}
      </span>
      <div className="rate-btns" role="group" aria-label={`${label} 평점`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={value === n}
            aria-label={`${label} ${n}점`}
            onClick={() => onChange(value === n ? undefined : n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
