import { ApiError, newIdempotencyKey } from "@/lib/api/client";

export type PendingOperation<T> = { key: string; payload: T };

const prefix = "shopupu.operation.";

export function readOperation<T>(scope: string): PendingOperation<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(prefix + scope);
    if (!raw) return null;
    const value = JSON.parse(raw);
    return typeof value.key === "string" && value.key && "payload" in value ? value : null;
  } catch {
    return null;
  }
}

/** Save before sending: a timeout may hide an operation already committed by the server. */
export function beginOperation<T>(scope: string, payload: T): PendingOperation<T> {
  const previous = readOperation<T>(scope);
  if (previous) return previous;
  const operation = { key: newIdempotencyKey(), payload };
  try {
    window.sessionStorage.setItem(prefix + scope, JSON.stringify(operation));
  } catch {
    throw new ApiError(0, "Allow browser storage before continuing so an interrupted order can be recovered.", {
      code: "STORAGE_UNAVAILABLE"
    });
  }
  return operation;
}

export function finishOperation(scope: string) {
  window.sessionStorage.removeItem(prefix + scope);
}

export function isDefinitiveRejection(error: unknown) {
  // A conflict may mean a concurrent attempt is still being resolved. Keep its key.
  return error instanceof ApiError && [400, 403, 404, 422].includes(error.status);
}
