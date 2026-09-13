"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/LocaleProvider";

const ARMED_MS = 6000;

/**
 * Two-step inline confirm for irreversible actions (cancel an order, delete a
 * product). The first click arms the control in place — no modal — and the
 * destructive choice becomes explicit next to a "keep" escape hatch. It
 * disarms on Escape, on blur-away, or after a few seconds. Reversible actions
 * (remove from cart, wishlist) should offer undo instead of using this.
 */
export function ConfirmButton({
  label,
  confirmLabel,
  keepLabel,
  onConfirm,
  disabled,
  className = "button buttonRed"
}: {
  label: string;
  confirmLabel: string;
  keepLabel?: string;
  onConfirm: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  const [armed, setArmed] = useState(false);
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!armed) return;
    confirmRef.current?.focus();
    const timer = setTimeout(() => setArmed(false), ARMED_MS);
    return () => clearTimeout(timer);
  }, [armed]);

  const disarm = (restoreFocus = false) => {
    setArmed(false);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  };

  if (!armed) {
    return (
      <button ref={triggerRef} type="button" className={className} disabled={disabled} onClick={() => setArmed(true)}>
        {label}
      </button>
    );
  }

  return (
    <span
      className="confirmRow"
      role="group"
      aria-label={label}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          disarm(true);
        }
      }}
      onBlur={(event) => {
        // focus left the pair entirely (e.g. tabbed away) — nothing was chosen
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) disarm();
      }}
    >
      <button
        ref={confirmRef}
        type="button"
        className={className}
        disabled={disabled}
        onClick={() => {
          setArmed(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </button>
      <button type="button" className="button" onClick={() => disarm(true)}>
        {keepLabel ?? t("common.keep")}
      </button>
    </span>
  );
}
