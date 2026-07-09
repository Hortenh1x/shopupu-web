const STARS = [1, 2, 3, 4, 5];

function Star({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.6l2.83 5.94 6.52.84-4.79 4.5 1.23 6.45L12 17.2l-5.79 3.13 1.23-6.45-4.79-4.5 6.52-.84L12 2.6z"
        fill={filled ? "var(--accent)" : "transparent"}
        stroke={filled ? "var(--primary-deep)" : "var(--ink-mute)"}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function RatingStars({ value, onChange }: { value: number; onChange?: (value: number) => void }) {
  if (onChange) {
    return (
      <div style={{ display: "inline-flex", gap: 2 }} role="radiogroup" aria-label="Rating">
        {STARS.map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === Math.round(value)}
            aria-label={`${star} of 5`}
            onClick={() => onChange(star)}
            style={{ border: 0, background: "transparent", cursor: "pointer", padding: 2, display: "inline-flex" }}
          >
            <Star filled={star <= Math.round(value)} />
          </button>
        ))}
      </div>
    );
  }

  // read-only: overlay filled stars clipped to the fractional width
  const percent = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span
      style={{ position: "relative", display: "inline-flex", gap: 2 }}
      aria-label={`${value.toFixed(1)} out of 5`}
      role="img"
    >
      {STARS.map((star) => (
        <Star key={star} filled={false} />
      ))}
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "inline-flex",
          gap: 2,
          overflow: "hidden",
          clipPath: `inset(0 ${100 - percent}% 0 0)`
        }}
        aria-hidden="true"
      >
        {STARS.map((star) => (
          <Star key={star} filled />
        ))}
      </span>
    </span>
  );
}
