import { clearSession, getAccessToken, getRefreshToken, setTokens } from "@/lib/auth/session";
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
  retryOnUnauthorized?: boolean;
};

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
    throw new ApiError(response.status, problem?.detail ?? problem?.message ?? response.statusText, problem ?? undefined);
  }
  return data as T;
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearSession();
    return false;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/auth/refresh`, {
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
