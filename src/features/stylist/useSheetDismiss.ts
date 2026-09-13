"use client";

import { useRef, type PointerEvent, type RefObject } from "react";
import { animateSpring, prefersReducedMotion, projectMomentum, rubberband, type SpringHandle } from "@/lib/motion/spring";

const VELOCITY_WINDOW_MS = 120;
const FLICK_DOWN = 500; // px/s — a clear downward flick dismisses regardless of distance
const FLICK_UP = -200; // px/s — an upward flick always snaps back
const EXIT_TRANSITION_MS = 320;

type Sample = { t: number; y: number };

/**
 * Drag-to-dismiss for the mobile stylist sheet. The sheet tracks the finger
 * 1:1 from where it was grabbed, resists past its resting position, and on
 * release continues at the finger's velocity into a spring that either snaps
 * home or carries the sheet off-screen. A grab during that spring takes over
 * from the sheet's current on-screen position, so nothing has to finish first.
 */
export function useSheetDismiss({
  panelRef,
  enabled,
  onDismiss
}: {
  panelRef: RefObject<HTMLElement | null>;
  enabled: () => boolean;
  onDismiss: () => void;
}) {
  const dragging = useRef(false);
  const startY = useRef(0);
  const base = useRef(0);
  const samples = useRef<Sample[]>([]);
  const spring = useRef<SpringHandle | null>(null);

  const currentOffset = (panel: HTMLElement) => {
    // presentation value: whatever is on screen right now, mid-animation included
    const transform = getComputedStyle(panel).transform;
    if (!transform || transform === "none") return 0;
    return new DOMMatrixReadOnly(transform).m42;
  };

  const place = (panel: HTMLElement, y: number) => {
    panel.style.transform = y === 0 ? "" : `translateY(${y}px)`;
  };

  const settleHome = (panel: HTMLElement) => {
    place(panel, 0);
    panel.removeAttribute("data-dragging");
  };

  const settleAway = (panel: HTMLElement) => {
    // leave the sheet where the spring left it while the CSS exit fades it out
    panel.removeAttribute("data-dragging");
    onDismiss();
    window.setTimeout(() => place(panel, 0), EXIT_TRANSITION_MS);
  };

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    const panel = panelRef.current;
    if (!panel || !enabled() || !event.isPrimary) return;
    spring.current?.cancel();
    spring.current = null;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // synthetic pointer ids can reject capture; the drag still works
    }
    dragging.current = true;
    base.current = currentOffset(panel);
    startY.current = event.clientY;
    samples.current = [{ t: event.timeStamp, y: base.current }];
    panel.setAttribute("data-dragging", "true");
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const panel = panelRef.current;
    if (!panel || !dragging.current) return;
    let y = base.current + (event.clientY - startY.current);
    // above its resting position the sheet resists instead of stopping dead
    if (y < 0) y = -rubberband(-y, panel.offsetHeight);
    place(panel, y);
    const now = event.timeStamp;
    samples.current.push({ t: now, y });
    samples.current = samples.current.filter((sample) => now - sample.t <= VELOCITY_WINDOW_MS);
  };

  const release = () => {
    const panel = panelRef.current;
    if (!panel || !dragging.current) return;
    dragging.current = false;

    const first = samples.current[0];
    const last = samples.current[samples.current.length - 1];
    const elapsed = last && first ? (last.t - first.t) / 1000 : 0;
    const velocity = elapsed > 0.016 ? (last.y - first.y) / elapsed : 0;

    const y = currentOffset(panel);
    const height = panel.offsetHeight;
    const projected = y + projectMomentum(velocity);
    // the flick's direction decides; only a still hand falls back to position
    const dismiss = velocity > FLICK_DOWN || (velocity > FLICK_UP && projected > height / 2);
    const target = dismiss ? height + 16 : 0;

    if (prefersReducedMotion()) {
      place(panel, target);
      if (dismiss) settleAway(panel);
      else settleHome(panel);
      return;
    }

    spring.current = animateSpring(y, target, {
      response: 0.35,
      // a little give when it returns after a throw; none when it leaves
      dampingRatio: dismiss ? 1 : 0.85,
      velocity,
      onUpdate: (value) => place(panel, value),
      onSettle: () => {
        spring.current = null;
        if (dismiss) settleAway(panel);
        else settleHome(panel);
      }
    });
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: release,
    onPointerCancel: release
  };
}
