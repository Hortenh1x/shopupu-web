import { clearSession, getAccessToken, getCartToken, getRefreshToken, setTokens } from "@/lib/auth/session";
import type { ApiProblem, TokenPairResponse } from "@/lib/api/types";

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
  const response = await rawApiFetch(path, options);
  if (response.status === 401 && options.auth !== false && options.retryOnUnauthorized !== false) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiFetch<T>(path, { ...options, retryOnUnauthorized: false });
    }
  }
  return readResponse<T>(response);
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
      `Cannot reach shopupu API at ${apiBaseUrl}. Check that the backend is running and CORS allows this origin.`,
      error instanceof Error ? { message: error.message } : undefined
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

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken() {
  // single-flight: parallel 401s share one refresh call (rotation-safe)
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function doRefresh() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearSession();
    return false;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ refreshToken })
    });
    if (!response.ok) {
      clearSession();
      return false;
    }
    const tokens = (await response.json()) as TokenPairResponse;
    setTokens(tokens);
    return true;
  } catch {
    clearSession();
    return false;
  }
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}
