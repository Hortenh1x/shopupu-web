/**
 * Minimal spring + momentum helpers for gesture-driven motion (the stylist
 * sheet). Parameters follow Apple's designer-facing pair rather than raw
 * physics: `response` (seconds to approach the target) and `dampingRatio`
 * (1 = no overshoot, <1 = bounce). Springs start from the current value and
 * inherit the gesture's velocity, so they can be grabbed and re-targeted at
 * any moment without a visible seam.
 */

export type SpringOptions = {
  /** approach time in seconds; lower = snappier */
  response?: number;
  /** 1 = critically damped, ~0.8 = slight bounce (use only after a flick) */
  dampingRatio?: number;
  /** initial velocity in units/s, typically the release velocity of the finger */
  velocity?: number;
  onUpdate: (value: number) => void;
  onSettle?: () => void;
};

export type SpringHandle = { cancel: () => void };

const MAX_FRAME_S = 1 / 30;
const REST_DISTANCE = 0.5;
const REST_VELOCITY = 20;

export function animateSpring(from: number, to: number, options: SpringOptions): SpringHandle {
  const response = options.response ?? 0.35;
  const dampingRatio = options.dampingRatio ?? 1;
  // mass 1: stiffness and damping derived from the response/damping pair
  const stiffness = (2 * Math.PI / response) ** 2;
  const damping = (4 * Math.PI * dampingRatio) / response;

  let x = from;
  let v = options.velocity ?? 0;
  let last = performance.now();
  let frame = 0;
  let done = false;

  const step = (now: number) => {
    if (done) return;
    // clamp so a background tab does not integrate one huge step on return
    const dt = Math.min((now - last) / 1000, MAX_FRAME_S);
    last = now;
    const acceleration = -stiffness * (x - to) - damping * v;
    v += acceleration * dt;
    x += v * dt;
    if (Math.abs(x - to) < REST_DISTANCE && Math.abs(v) < REST_VELOCITY) {
      done = true;
      options.onUpdate(to);
      options.onSettle?.();
      return;
    }
    options.onUpdate(x);
    frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);

  return {
    cancel: () => {
      done = true;
      cancelAnimationFrame(frame);
    }
  };
}

/**
 * Where a flick would come to rest on its own (UIScrollView deceleration):
 * used to pick the snap target from the gesture's momentum, not its position.
 */
export function projectMomentum(velocity: number, decelerationRate = 0.998) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** Progressive resistance past a boundary — the further past, the less it follows. */
export function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
