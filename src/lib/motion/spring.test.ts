import { afterEach, describe, expect, it, vi } from "vitest";
import { animateSpring, projectMomentum, rubberband } from "@/lib/motion/spring";

/** Drives requestAnimationFrame synchronously with a 16ms clock. */
function installFrameClock() {
  let now = performance.now();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    now += 16;
    callback(now);
    return 0;
  });
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
}

afterEach(() => vi.unstubAllGlobals());

describe("momentum projection", () => {
  it("projects a flick to where scroll deceleration would leave it", () => {
    // UIScrollView normal rate: 1000 px/s travels ~499px before resting
    expect(projectMomentum(1000)).toBeCloseTo(499, 0);
    expect(projectMomentum(-1000)).toBeCloseTo(-499, 0);
    expect(projectMomentum(0)).toBe(0);
  });
});

describe("rubberband", () => {
  it("follows less and less the further past the boundary", () => {
    const small = rubberband(20, 400);
    const large = rubberband(200, 400);
    expect(small).toBeLessThan(20);
    expect(large).toBeLessThan(200);
    expect(large - small).toBeLessThan(180);
    expect(large).toBeGreaterThan(small);
  });
});

describe("animateSpring", () => {
  it("settles exactly on the target without overshoot when critically damped", () => {
    installFrameClock();
    const values: number[] = [];
    const settled = vi.fn();
    animateSpring(120, 0, { response: 0.35, dampingRatio: 1, onUpdate: (v) => values.push(v), onSettle: settled });
    expect(settled).toHaveBeenCalledTimes(1);
    expect(values.at(-1)).toBe(0);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(-0.5);
    expect(values.length).toBeGreaterThan(5);
  });

  it("carries the release velocity into the motion", () => {
    installFrameClock();
    const still: number[] = [];
    const thrown: number[] = [];
    animateSpring(0, 300, { response: 0.35, dampingRatio: 1, onUpdate: (v) => still.push(v) });
    animateSpring(0, 300, { response: 0.35, dampingRatio: 1, velocity: 2000, onUpdate: (v) => thrown.push(v) });
    // same first frame, but the thrown one is already further along
    expect(thrown[0]).toBeGreaterThan(still[0]);
    expect(thrown.at(-1)).toBe(300);
  });

  it("can be cancelled mid-flight so a grab takes over from the current value", () => {
    let frame: FrameRequestCallback | null = null;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frame = callback;
      return 1;
    });
    const cancelFrame = vi.fn();
    vi.stubGlobal("cancelAnimationFrame", cancelFrame);
    const values: number[] = [];
    const handle = animateSpring(100, 0, { onUpdate: (v) => values.push(v) });
    frame!(performance.now() + 16);
    expect(values.length).toBe(1);
    handle.cancel();
    frame!(performance.now() + 32);
    expect(values.length).toBe(1);
    expect(cancelFrame).toHaveBeenCalled();
  });
});
