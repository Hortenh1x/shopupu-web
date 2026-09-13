import type { TokenPairResponse, UserProfile } from "@/lib/api/types";

const refreshTokenKey = "shopupu.refreshToken";
const cartTokenKey = "shopupu.cartToken";
export const sessionEventKey = "shopupu.sessionEvent";

let accessToken: string | null = null;
let currentUser: UserProfile | null = null;
let sessionVersion = 0;
let observedMarker: string | null = null;
let pendingSessionChange: Promise<void> = Promise.resolve();
let sessionError: string | null = null;
let persistenceBlocked = false;
const listeners = new Set<() => void>();

class SessionPersistenceError extends Error {}

function notify() { listeners.forEach((listener) => listener()); }

function resetMemory() {
  accessToken = null;
  currentUser = null;
  sessionVersion += 1;
  notify();
}

function blockPersistence(message: string) {
  sessionError = message;
  if (!persistenceBlocked) {
    persistenceBlocked = true;
    resetMemory();
  } else notify();
}

function storageError() {
  return new SessionPersistenceError("Browser storage is unavailable. This tab is signed out. Allow storage and reload before signing in again.");
}

function readRawMarker() {
  return typeof window === "undefined" ? null : window.localStorage.getItem(sessionEventKey);
}

function readMarker() {
  if (persistenceBlocked) return observedMarker;
  try { return readRawMarker(); }
  catch { blockPersistence(storageError().message); return observedMarker; }
}

observedMarker = readMarker();

export type SessionSnapshot = { version: number; marker: string | null };

export function captureSession(): SessionSnapshot {
  reconcileSession();
  return { version: sessionVersion, marker: observedMarker };
}

export function isCurrentSession(snapshot: SessionSnapshot) {
  const marker = readMarker();
  return !persistenceBlocked && snapshot.version === sessionVersion && snapshot.marker === marker;
}

export async function withSessionLock<T>(operation: () => Promise<T> | T): Promise<T> {
  if (typeof navigator === "undefined" || !navigator.locks) {
    throw new SessionPersistenceError("Secure sign-in is unavailable on this page. Open the HTTPS or localhost address and allow browser storage, then reload.");
  }
  return await navigator.locks.request("shopupu-session", operation);
}

export function waitForSessionChange() { return pendingSessionChange; }
export function getSessionError() { return sessionError; }

export function subscribeSession(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function getSessionVersion() { return sessionVersion; }

/** Passive snapshot for render-bound observers; captureSession reconciles before actions. */
export function getSessionSnapshot(): SessionSnapshot { return { version: sessionVersion, marker: observedMarker }; }

/** A login/logout in another tab changes identity; refresh rotation alone does not. */
export function syncSessionFromStorage(event: StorageEvent) {
  if (event.key === sessionEventKey || event.key === null) reconcileSession();
}

function reconcileSession() {
  const marker = readMarker();
  if (!persistenceBlocked && marker !== observedMarker) {
    observedMarker = marker;
    resetMemory();
  }
}

export function announceSessionChange() {
  if (typeof window !== "undefined") {
    const marker = crypto.randomUUID();
    // The in-memory marker must never precede a storage write that can fail.
    window.localStorage.setItem(sessionEventKey, marker);
    observedMarker = marker;
  }
}

export function getAccessToken() { return persistenceBlocked ? null : accessToken; }
export function getCurrentUser() { return persistenceBlocked ? null : currentUser; }

export function setCurrentUser(user: UserProfile | null) {
  if (persistenceBlocked) return;
  currentUser = user;
  notify();
}

export function getRefreshToken(options: { underLock?: boolean } = {}) {
  if (typeof window === "undefined" || persistenceBlocked) return null;
  try {
    const stored = window.localStorage.getItem(refreshTokenKey);
    if (!stored) return null;
    // Read the former plain-token format until this client next rotates it.
    if (!stored.startsWith("{")) return stored;
    const record: unknown = JSON.parse(stored);
    if (!record || typeof record !== "object" || !("token" in record) || typeof record.token !== "string" ||
      !("marker" in record) || (record.marker !== null && typeof record.marker !== "string")) throw storageError();
    if (record.marker !== readRawMarker()) {
      // An outside-lock reader may see another tab between staging and commit.
      // Only the lock owner can establish that a mismatch survived publication.
      if (options.underLock) blockPersistence("A session update could not be saved completely. This tab is signed out; allow browser storage and reload before signing in again.");
      return null;
    }
    return record.token;
  } catch { blockPersistence(storageError().message); return null; }
}

/** Refresh already owns the writer lock. Publish memory only after persistence succeeds. */
export function setTokens(tokens: TokenPairResponse) {
  if (persistenceBlocked) throw storageError();
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(refreshTokenKey, JSON.stringify({ token: tokens.refreshToken, marker: observedMarker }));
    accessToken = tokens.accessToken;
  } catch {
    blockPersistence(storageError().message);
    throw storageError();
  }
}

function restoreValue(key: string, value: string | null) {
  if (value === null) window.localStorage.removeItem(key);
  else window.localStorage.setItem(key, value);
}

/** Persist the whole new identity before publishing its memory/cache generation. */
export function startSession(tokens: TokenPairResponse, user: UserProfile, expected: SessionSnapshot, assertCurrent?: () => void, mergedGuestToken: string | null = null) {
  return withSessionLock(() => {
    if (!isCurrentSession(expected)) throw new Error(sessionError ?? "Your session changed. Please try again.");
    assertCurrent?.();
    let previousRefresh: string | null;
    let previousMarker: string | null;
    let previousCart: string | null;
    let marker: string;
    let cartRemoved = false;
    try {
      previousRefresh = window.localStorage.getItem(refreshTokenKey);
      previousMarker = readRawMarker();
      previousCart = window.localStorage.getItem(cartTokenKey);
      marker = crypto.randomUUID();
    } catch {
      blockPersistence(storageError().message);
      throw storageError();
    }
    const stagedRefresh = JSON.stringify({ token: tokens.refreshToken, marker });
    try {
      window.localStorage.setItem(refreshTokenKey, stagedRefresh);
      // MFA may finish after another tab has replaced the original guest cart.
      if (mergedGuestToken !== null && previousCart === mergedGuestToken) {
        window.localStorage.removeItem(cartTokenKey);
        cartRemoved = true;
      }
      window.localStorage.setItem(sessionEventKey, marker);
    } catch {
      // Cooperative writers hold this same lock. Conditional rollback also avoids
      // overwriting a record that an external/uncooperative writer already replaced.
      try {
        const currentMarker = readRawMarker();
        if ((currentMarker === previousMarker || currentMarker === marker)
          && window.localStorage.getItem(refreshTokenKey) === stagedRefresh) {
          restoreValue(refreshTokenKey, previousRefresh);
          if (cartRemoved && window.localStorage.getItem(cartTokenKey) === null) restoreValue(cartTokenKey, previousCart);
          if (currentMarker === marker) restoreValue(sessionEventKey, previousMarker);
        }
      } catch { /* Persistence is no longer trustworthy; the tab stays signed out. */ }
      blockPersistence(storageError().message);
      throw storageError();
    }
    accessToken = tokens.accessToken;
    currentUser = user;
    observedMarker = marker;
    sessionError = null;
    sessionVersion += 1;
    notify();
  }).catch((error: unknown) => {
    if (error instanceof SessionPersistenceError) blockPersistence(error.message);
    throw error;
  });
}

export function clearSession() {
  const marker = observedMarker;
  resetMemory();
  pendingSessionChange = withSessionLock(() => {
    // A queued logout from A must not erase an identity already published by B.
    if (marker !== readRawMarker()) { reconcileSession(); return; }
    window.localStorage.removeItem(refreshTokenKey);
    announceSessionChange();
  }).catch((error: unknown) => {
    blockPersistence(error instanceof SessionPersistenceError ? error.message :
      "Sign-out could not be saved in browser storage. This tab is signed out; allow storage and reload to verify other tabs are signed out.");
  });
  // Always settle: a permanently rejected promise would make each restored
  // provider call clearSession again, incrementing generations indefinitely.
  return pendingSessionChange;
}

/** Refresh already holds the shared lock, so it must not try to acquire it again. */
export function clearSessionInsideLock(expected: SessionSnapshot) {
  if (!isCurrentSession(expected)) return;
  try {
    window.localStorage.removeItem(refreshTokenKey);
    announceSessionChange();
    resetMemory();
  } catch { blockPersistence(storageError().message); }
}

export function getCartToken() {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(cartTokenKey); }
  catch { blockPersistence(storageError().message); return null; }
}

export function setCartToken(token: string | null) {
  if (typeof window === "undefined") return;
  try { restoreValue(cartTokenKey, token); }
  catch { throw new Error("The guest cart could not be saved. Allow browser storage and try again."); }
}
