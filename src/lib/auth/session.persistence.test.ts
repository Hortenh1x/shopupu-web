import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserProfile } from "@/lib/api/types";

const user = (id: number): UserProfile => ({ id, email: `user-${id}@example.invalid`, enabled: true, emailVerified: false, roles: ["CUSTOMER"] });
let session: typeof import("@/lib/auth/session");

beforeEach(async () => {
  vi.resetModules();
  window.localStorage.clear();
  session = await import("@/lib/auth/session");
});
afterEach(() => vi.restoreAllMocks());

describe("session persistence failure boundaries", () => {
  it("never leaves B's bearer with A's user/cache when the refresh write fails", async () => {
    session.setTokens({ accessToken: "access-a", refreshToken: "refresh-a" });
    session.setCurrentUser(user(1));
    const expected = session.captureSession();
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => { throw new DOMException("full", "QuotaExceededError"); });
    await expect(session.startSession({ accessToken: "access-b", refreshToken: "refresh-b" }, user(2), expected)).rejects.toThrow("storage");
    expect(session.getAccessToken()).toBeNull();
    expect(session.getCurrentUser()).toBeNull();
    expect(session.getSessionVersion()).toBeGreaterThan(expected.version);
    expect(JSON.parse(window.localStorage.getItem("shopupu.refreshToken")!).token).toBe("refresh-a");
  });

  it("rolls back a staged refresh when publishing the shared marker fails", async () => {
    session.setTokens({ accessToken: "access-a", refreshToken: "refresh-a" });
    session.setCurrentUser(user(1));
    const expected = session.captureSession();
    const original = window.localStorage.setItem.bind(window.localStorage);
    vi.spyOn(window.localStorage, "setItem").mockImplementation((key, value) => {
      if (key === session.sessionEventKey) throw new DOMException("blocked", "SecurityError");
      original(key, value);
    });
    await expect(session.startSession({ accessToken: "access-b", refreshToken: "refresh-b" }, user(2), expected)).rejects.toThrow("storage");
    expect(JSON.parse(window.localStorage.getItem("shopupu.refreshToken")!).token).toBe("refresh-a");
    expect(session.getAccessToken()).toBeNull();
    expect(session.getCurrentUser()).toBeNull();
  });

  it("drops the memory identity even when rollback also fails", async () => {
    session.setTokens({ accessToken: "access-a", refreshToken: "refresh-a" });
    session.setCurrentUser(user(1));
    const expected = session.captureSession();
    const original = window.localStorage.setItem.bind(window.localStorage);
    vi.spyOn(window.localStorage, "setItem").mockImplementation((key, value) => {
      if (key === session.sessionEventKey || JSON.parse(value).token === "refresh-a") throw new DOMException("blocked", "SecurityError");
      original(key, value);
    });
    await expect(session.startSession({ accessToken: "access-b", refreshToken: "refresh-b" }, user(2), expected)).rejects.toThrow("storage");
    expect(session.getAccessToken()).toBeNull(); expect(session.getCurrentUser()).toBeNull();
    expect(session.isCurrentSession(session.captureSession())).toBe(false);
    // A second tab has no memory of the failed writer. The persisted token's
    // own marker still prevents restoring B under A's previous generation.
    vi.restoreAllMocks();
    vi.resetModules();
    const otherTab = await import("@/lib/auth/session");
    otherTab.setCurrentUser(user(1));
    expect(await otherTab.withSessionLock(() => otherTab.getRefreshToken({ underLock: true }))).toBeNull();
    expect(otherTab.getCurrentUser()).toBeNull();
    expect(otherTab.getSessionError()).toContain("completely");
  });

  it("settles failed sign-out instead of retaining a rejection that repeats generations", async () => {
    const locks = navigator.locks;
    Object.defineProperty(navigator, "locks", { configurable: true, value: undefined });
    try {
      await expect(session.clearSession()).resolves.toBeUndefined();
      const version = session.getSessionVersion();
      await expect(session.waitForSessionChange()).resolves.toBeUndefined();
      await expect(session.waitForSessionChange()).resolves.toBeUndefined();
      expect(session.getSessionVersion()).toBe(version);
      expect(session.getSessionError()).toContain("HTTPS");
    } finally { Object.defineProperty(navigator, "locks", { configurable: true, value: locks }); }
  });

  it("can import and render public state when browser storage access is denied", async () => {
    vi.spyOn(window.localStorage, "getItem").mockImplementation(() => { throw new DOMException("blocked", "SecurityError"); });
    vi.resetModules();
    const isolated = await import("@/lib/auth/session");
    expect(isolated.getCurrentUser()).toBeNull();
    expect(isolated.getRefreshToken()).toBeNull();
    expect(isolated.getSessionError()).toContain("storage");
  });
});
