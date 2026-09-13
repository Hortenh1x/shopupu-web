import { captureSession, clearSessionInsideLock, getAccessToken, getCartToken, getRefreshToken, isCurrentSession, setTokens, withSessionLock, type SessionSnapshot } from "@/lib/auth/session";
import type { ApiProblem, TokenPairResponse } from "@/lib/api/types";

import { browserLocale } from "@/lib/i18n/core";

export const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  status: number;
  problem?: ApiProblem;

  constructor(status: number, message: string, problem?: ApiProblem) {
    super(message);
    this.status = status;
    this.problem = problem;
  }
}

type ApiFetchOptions = RequestInit & {
  auth?: boolean;
  /** attach the guest cart token header (cart + auth merge endpoints) */
  cartToken?: boolean;
  /** value for the Idempotency-Key header (checkout, payments) */
  idempotencyKey?: string;
  retryOnUnauthorized?: boolean;
};

export function newIdempotencyKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const session = captureSession();
  const assertSession = () => {
    if (options.auth !== false && !isCurrentSession(session)) {
      throw new ApiError(401, "Your session changed. Please try again.", { code: "SESSION_CHANGED" });
    }
  };
  const response = await rawApiFetch(path, options);
  assertSession();
  if (response.status === 401 && options.auth !== false && options.retryOnUnauthorized !== false) {
    const refreshed = await refreshAccessToken(session);
    assertSession();
    if (refreshed) {
      return apiFetch<T>(path, { ...options, retryOnUnauthorized: false });
    }
  }
  const result = await readResponse<T>(response);
  assertSession();
  return result;
}

export async function apiJson<T>(path: string, body: unknown, options: ApiFetchOptions = {}) {
  return apiFetch<T>(path, {
    ...options,
    method: options.method ?? "POST",
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    body: JSON.stringify(body)
  });
}

export async function apiForm<T>(path: string, formData: FormData, options: ApiFetchOptions = {}) {
  return apiFetch<T>(path, {
    ...options,
    method: options.method ?? "POST",
    body: formData
  });
}

async function rawApiFetch(path: string, options: ApiFetchOptions) {
  const headers = new Headers(options.headers);
  headers.set("Accept-Language", browserLocale());
  if (options.auth !== false) {
    const token = getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }
  if (options.cartToken) {
    const cartToken = getCartToken();
    if (cartToken) {
      headers.set("X-Cart-Token", cartToken);
    }
  }
  if (options.idempotencyKey) {
    headers.set("Idempotency-Key", options.idempotencyKey);
  }

  try {
    return await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers,
      cache: "no-store"
    });
  } catch (error) {
    throw new ApiError(
      0,
      "We could not connect. Please try again in a moment.",
      { code: "NETWORK_ERROR" }
    );
  }
}

async function readResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? safeJson(text) : null;
  if (!response.ok) {
    const problem = data as ApiProblem | null;
    throw new ApiError(response.status, problemMessage(response, problem), problem ?? undefined);
  }
  return data as T;
}

function problemMessage(response: Response, problem: ApiProblem | null) {
  if (problem?.errors?.length) {
    return problem.errors.map((e) => `${e.field}: ${e.message}`).join("; ");
  }
  if (response.status === 429) {
    return "Too many requests - please slow down and try again shortly.";
  }
  return problem?.detail ?? problem?.message ?? response.statusText;
}

let refreshFlight: { session: SessionSnapshot; promise: Promise<boolean> } | null = null;

async function refreshAccessToken(session: SessionSnapshot) {
  // single-flight: parallel 401s share one refresh call (rotation-safe)
  if (refreshFlight?.session.version === session.version && refreshFlight.session.marker === session.marker) return refreshFlight.promise;
  // The same lock protects login/logout publication and token rotation in every tab.
  const promise = withSessionLock(() => doRefresh(session)).finally(() => {
    if (refreshFlight?.promise === promise) refreshFlight = null;
  });
  refreshFlight = { session, promise };
  return promise;
}

async function doRefresh(session: SessionSnapshot) {
  if (!isCurrentSession(session)) return false;
  const refreshToken = getRefreshToken({ underLock: true });
  if (!refreshToken) {
    clearSessionInsideLock(session);
    return false;
  }

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/api/v1/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ refreshToken }),
      signal: AbortSignal.timeout(15_000)
    });
  } catch {
    // Transport failure (offline, timeout, navigation abort): the outcome is unknown, so the stored
    // session stays for the next attempt. Wiping it here would sign every tab out on a network blip.
    throw new ApiError(0, "We could not connect. Please try again in a moment.", { code: "NETWORK_ERROR" });
  }
  if (!isCurrentSession(session)) return false;
  if (DEFINITIVE_REFRESH_REJECTIONS.has(response.status)) {
    clearSessionInsideLock(session);
    return false;
  }
  if (!response.ok) {
    // 5xx/429 say nothing about the token itself; surface the failure without ending the session.
    const text = await response.text();
    const problem = (text ? safeJson(text) : null) as ApiProblem | null;
    throw new ApiError(response.status, problemMessage(response, problem), problem ?? undefined);
  }
  let tokens: TokenPairResponse;
  try {
    tokens = (await response.json()) as TokenPairResponse;
  } catch {
    throw new ApiError(0, "We could not connect. Please try again in a moment.", { code: "NETWORK_ERROR" });
  }
  if (!isCurrentSession(session)) return false;
  setTokens(tokens);
  return true;
}

/** Only the server's verdict on the token ends the stored session; everything else is retried later. */
const DEFINITIVE_REFRESH_REJECTIONS = new Set([400, 401, 403]);

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}
