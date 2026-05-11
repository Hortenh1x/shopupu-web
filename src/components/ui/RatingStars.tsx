export function RatingStars({ value, onChange }: { value: number; onChange?: (value: number) => void }) {
  return (
    <div style={{ display: "inline-flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          aria-label={`${star} stars`}
          onClick={() => onChange?.(star)}
          style={{
            border: 0,
            background: "transparent",
            cursor: onChange ? "pointer" : "default",
            fontSize: 24,
            color: star <= Math.round(value) ? "var(--color-black)" : "var(--color-steel)"
          }}
        >
          {star <= Math.round(value) ? "■" : "□"}
        </button>
      ))}
    </div>
  );
}
