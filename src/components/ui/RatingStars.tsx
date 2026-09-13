"use client";

import { useI18n } from "@/lib/i18n/LocaleProvider";
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
  const { t, formatNumber } = useI18n();
  const focusedStar = Math.max(1, Math.min(5, Math.round(value)));
  if (onChange) {
    return (
      <div style={{ display: "inline-flex", gap: 4 }} role="radiogroup" aria-label={t("common.ratingLabel")}>
        {STARS.map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === Math.round(value)}
            aria-label={t("common.rating", { rating: star })}
            tabIndex={star === focusedStar ? 0 : -1}
            onKeyDown={(event) => {
              if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const next = event.key === "Home" ? 1 : event.key === "End" ? 5 :
                (star - 1 + (event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : 4)) % 5 + 1;
              onChange(next);
              (event.currentTarget.parentElement?.querySelectorAll("button")[next - 1] as HTMLButtonElement | undefined)?.focus();
            }}
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
      style={{ position: "relative", display: "inline-flex", gap: 4, width: "fit-content", justifySelf: "start" }}
      aria-label={t("common.rating", { rating: formatNumber(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) })}
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
          gap: 4,
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
