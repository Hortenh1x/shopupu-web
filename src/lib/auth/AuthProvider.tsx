"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ApiError } from "@/lib/api/client";
import { authApi } from "@/lib/api/shop";
import type { AuthResult, AuthenticatedResult, MfaEnrollment, TokenPairResponse, UserProfile } from "@/lib/api/types";
import {
  captureSession, clearSession, getAccessToken, getCartToken, getCurrentUser, getRefreshToken,
  getSessionVersion, getSessionError, isCurrentSession, setCurrentUser, startSession, subscribeSession, waitForSessionChange
} from "@/lib/auth/session";

type AuthContextValue = {
  user: UserProfile | null;
  isReady: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (email: string, password: string, passwordConfirm: string) => Promise<AuthResult>;
  loginWithGoogle: (idToken: string) => Promise<AuthResult>;
  startMfaEnrollment: (challengeToken: string) => Promise<MfaEnrollment>;
  verifyMfa: (challengeToken: string, code?: string, recoveryCode?: string) => Promise<AuthResult>;
  confirmMfaEnrollment: (challengeToken: string, code: string) => Promise<AuthResult>;
  acceptAuthenticatedResult: (result: AuthenticatedResult) => Promise<void>;
  cancelAuthentication: () => void;
  logout: () => void;
  reloadUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
type PendingAuthAttempt = { expected: ReturnType<typeof captureSession>; attempt: number; guestToken: string | null };

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const user = useSyncExternalStore(subscribeSession, getCurrentUser, () => null);
  const version = useSyncExternalStore(subscribeSession, getSessionVersion, () => 0);
  const persistenceError = useSyncExternalStore(subscribeSession, getSessionError, () => null);
  const [readyVersion, setReadyVersion] = useState<number | null>(null);
  const authAttempt = useRef(0);
  const mounted = useRef(true);
  const pendingAttempt = useRef<PendingAuthAttempt | null>(null);
  // Bind a deferred enrollment result to its initiating attempt without retaining its secrets.
  const resultAttempts = useRef(new WeakMap<AuthenticatedResult, PendingAuthAttempt>());

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; authAttempt.current += 1; pendingAttempt.current = null; };
  }, []);

  async function reloadUserInternal(expectedVersion: number) {
    if (!mounted.current || version !== expectedVersion || getSessionVersion() !== expectedVersion) return;
    const profile = await authApi.me();
    if (mounted.current && getSessionVersion() === expectedVersion) setCurrentUser(profile);
  }

  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        await waitForSessionChange();
        if (!active || getSessionVersion() !== version) return;
        if (!getSessionError() && !getAccessToken() && getRefreshToken()) await reloadUserInternal(version);
      } catch (error) {
        // Only a definitive rejection of the stored session ends it; a transport failure keeps the
        // refresh token for the next attempt instead of signing every tab out.
        const definitive = error instanceof ApiError && [400, 401, 403].includes(error.status);
        if (definitive && getSessionVersion() === version && !getSessionError()) await clearSession();
      } finally {
        if (active && getSessionVersion() === version) setReadyVersion(version);
      }
    }
    void restore();
    return () => { active = false; };
  }, [version]);

  function sessionChanged(): never {
    throw new ApiError(401, "Your session changed. Please try again.", { code: "SESSION_CHANGED" });
  }

  function assertPendingAttempt(expectedAttempt?: PendingAuthAttempt) {
    const pending = pendingAttempt.current;
    if (!mounted.current || version !== getSessionVersion() || !pending ||
      (expectedAttempt !== undefined && expectedAttempt !== pending) ||
      !isCurrentSession(pending.expected) || pending.attempt !== authAttempt.current) sessionChanged();
    return pending;
  }

  async function acceptAuthenticatedResult(tokens: AuthenticatedResult) {
    const boundAttempt = resultAttempts.current.get(tokens);
    if (!boundAttempt) sessionChanged();
    const pending = assertPendingAttempt(boundAttempt);
    // Validate the new identity with its explicit access token before publishing a session.
    const profile = await authApi.me(tokens.accessToken);
    assertPendingAttempt(pending);
    await startSession(tokens, profile, pending.expected, () => assertPendingAttempt(pending), pending.guestToken);
  }

  async function authenticate(operation: (guestToken: string | null) => Promise<AuthResult | TokenPairResponse>): Promise<AuthResult> {
    if (getSessionError()) throw new Error(getSessionError()!);
    if (!mounted.current || version !== getSessionVersion()) sessionChanged();
    const attempt = ++authAttempt.current;
    await waitForSessionChange();
    if (!mounted.current || version !== getSessionVersion() || attempt !== authAttempt.current) sessionChanged();
    const pending = { expected: captureSession(), attempt, guestToken: getCartToken() };
    pendingAttempt.current = pending;
    assertPendingAttempt(pending);
    const response = await operation(pending.guestToken);
    assertPendingAttempt(pending);
    const result: AuthResult = "status" in response ? response : { ...response, status: "AUTHENTICATED" };
    if (result.status === "AUTHENTICATED") {
      resultAttempts.current.set(result, pending);
      await acceptAuthenticatedResult(result);
    }
    return result;
  }

  async function continueMfa(operation: () => Promise<AuthResult>) {
    const pending = assertPendingAttempt();
    const result = await operation();
    assertPendingAttempt(pending);
    if (result.status === "AUTHENTICATED") resultAttempts.current.set(result, pending);
    // Enrollment returns recovery codes once. Keep the current subtree until the user saves them.
    if (result.status === "AUTHENTICATED" && !result.recoveryCodes?.length) await acceptAuthenticatedResult(result);
    return result;
  }

  const value: AuthContextValue = {
    user,
    isReady: Boolean(user) || readyVersion === version,
    isAuthenticated: Boolean(user),
    isAdmin: user?.roles?.some((role) => role.toUpperCase() === "ADMIN" || role.toUpperCase() === "MANAGER") ?? false,
    login: (email, password) => authenticate((guestToken) => authApi.login(email, password, guestToken)),
    register: (email, password, passwordConfirm) => authenticate((guestToken) => authApi.register(email, password, passwordConfirm, guestToken)),
    loginWithGoogle: (idToken) => authenticate((guestToken) => authApi.googleLogin(idToken, guestToken)),
    startMfaEnrollment: async (challengeToken) => {
      const pending = assertPendingAttempt();
      const result = await authApi.startMfaEnrollment(challengeToken);
      assertPendingAttempt(pending);
      return result;
    },
    verifyMfa: (challengeToken, code, recoveryCode) => continueMfa(() => authApi.verifyMfa(challengeToken, code, recoveryCode)),
    confirmMfaEnrollment: (challengeToken, code) => continueMfa(() => authApi.confirmMfaEnrollment(challengeToken, code)),
    acceptAuthenticatedResult,
    cancelAuthentication: () => { authAttempt.current += 1; pendingAttempt.current = null; },
    logout: () => {
      if (!mounted.current || version !== getSessionVersion()) return;
      const expected = captureSession();
      if (!isCurrentSession(expected) || expected.version !== version) return;
      authAttempt.current += 1;
      pendingAttempt.current = null;
      const refreshToken = getRefreshToken();
      if (refreshToken) void authApi.logout(refreshToken).catch(() => undefined);
      clearSession();
      router.push("/login");
    },
    reloadUser: () => reloadUserInternal(version)
  };

  return <AuthContext.Provider value={value}>
    {persistenceError ? <div className="page"><p role="alert" className="errorText">{persistenceError}</p></div> : null}
    {children}
  </AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
