import { beforeEach, describe, expect, it } from "vitest";
import { ApiError, apiFetch, apiJson, newIdempotencyKey } from "@/lib/api/client";
import { captureSession, clearSession, getAccessToken, getRefreshToken, getSessionVersion, sessionEventKey, setTokens, syncSessionFromStorage } from "@/lib/auth/session";
import { installFetchMock, jsonResponse } from "@/test/fetchMock";

const me = { id: 1, email: "buyer@example.com", enabled: true, emailVerified: true, roles: ["USER"] };

describe("apiFetch auth header", () => {
  beforeEach(() => clearSession());

  it("sends the bearer token when a session is active", async () => {
    const mock = installFetchMock();
    setTokens({ accessToken: "acc-1", refreshToken: "ref-1" });
    mock.on("GET", "/api/v1/auth/me", () => jsonResponse(200, me));

    await apiFetch("/api/v1/auth/me");

    expect(mock.requests[0].headers.get("Authorization")).toBe("Bearer acc-1");
  });

  it("sends no Authorization header for public calls (auth: false)", async () => {
    const mock = installFetchMock();
    setTokens({ accessToken: "acc-1", refreshToken: "ref-1" });
    mock.on("GET", "/api/v1/catalog/products", () => jsonResponse(200, { content: [] }));

    await apiFetch("/api/v1/catalog/products", { auth: false });

    expect(mock.requests[0].headers.get("Authorization")).toBeNull();
  });
});

describe("JWT auto-refresh", () => {
  beforeEach(() => clearSession());

  it("refreshes once on 401 and retries with the new access token", async () => {
    const mock = installFetchMock();
    setTokens({ accessToken: "stale", refreshToken: "ref-old" });
    mock.once("GET", "/api/v1/auth/me", () => jsonResponse(401));
    mock.on("POST", "/api/v1/auth/refresh", () =>
      jsonResponse(200, { accessToken: "fresh", refreshToken: "ref-new" })
    );
    mock.on("GET", "/api/v1/auth/me", () => jsonResponse(200, me));

    const result = await apiFetch<typeof me>("/api/v1/auth/me");

    expect(result).toEqual(me);
    expect(mock.sent("POST", "/api/v1/auth/refresh")[0].body).toEqual({ refreshToken: "ref-old" });
    const retried = mock.sent("GET", "/api/v1/auth/me")[1];
    expect(retried.headers.get("Authorization")).toBe("Bearer fresh");
    // the rotated pair replaced the old one
    expect(getAccessToken()).toBe("fresh");
    expect(getRefreshToken()).toBe("ref-new");
  });

  it("shares a single refresh call between parallel 401s (single-flight)", async () => {
    const mock = installFetchMock();
    setTokens({ accessToken: "stale", refreshToken: "ref-old" });
    mock.once("GET", "/api/v1/orders", () => jsonResponse(401));
    mock.once("GET", "/api/v1/users/me/profile", () => jsonResponse(401));
    mock.on("POST", "/api/v1/auth/refresh", () =>
      jsonResponse(200, { accessToken: "fresh", refreshToken: "ref-new" })
    );
    mock.on("GET", "/api/v1/orders", () => jsonResponse(200, { content: [] }));
    mock.on("GET", "/api/v1/users/me/profile", () => jsonResponse(200, me));

    await Promise.all([apiFetch("/api/v1/orders"), apiFetch("/api/v1/users/me/profile")]);

    expect(mock.sent("POST", "/api/v1/auth/refresh")).toHaveLength(1);
  });

  it("clears the session and surfaces the 401 when the refresh is rejected", async () => {
    const mock = installFetchMock();
    setTokens({ accessToken: "stale", refreshToken: "ref-revoked" });
    mock.on("GET", "/api/v1/auth/me", () => jsonResponse(401));
    mock.on("POST", "/api/v1/auth/refresh", () => jsonResponse(401));

    await expect(apiFetch("/api/v1/auth/me")).rejects.toMatchObject({ status: 401 });

    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("keeps the stored session when the refresh request fails at the transport level", async () => {
    const mock = installFetchMock();
    setTokens({ accessToken: "stale", refreshToken: "ref-kept" });
    mock.on("GET", "/api/v1/auth/me", () => jsonResponse(401));
    mock.on("POST", "/api/v1/auth/refresh", () => { throw new TypeError("Failed to fetch"); });

    await expect(apiFetch("/api/v1/auth/me")).rejects.toMatchObject({ status: 0, problem: { code: "NETWORK_ERROR" } });

    // Unknown outcome: the next attempt may still succeed, and other tabs must not be signed out.
    expect(getRefreshToken()).toBe("ref-kept");
  });

  it("keeps the stored session when the refresh endpoint is temporarily unavailable", async () => {
    const mock = installFetchMock();
    setTokens({ accessToken: "stale", refreshToken: "ref-kept" });
    mock.on("GET", "/api/v1/auth/me", () => jsonResponse(401));
    mock.on("POST", "/api/v1/auth/refresh", () => jsonResponse(503, { code: "SERVICE_UNAVAILABLE", detail: "maintenance" }));

    await expect(apiFetch("/api/v1/auth/me")).rejects.toMatchObject({ status: 503 });

    expect(getRefreshToken()).toBe("ref-kept");
  });

  it("does not try to refresh when retryOnUnauthorized is off", async () => {
    const mock = installFetchMock();
    setTokens({ accessToken: "stale", refreshToken: "ref-old" });
    mock.on("GET", "/api/v1/auth/me", () => jsonResponse(401));

    await expect(apiFetch("/api/v1/auth/me", { retryOnUnauthorized: false })).rejects.toBeInstanceOf(ApiError);

    expect(mock.sent("POST", "/api/v1/auth/refresh")).toHaveLength(0);
  });

  it("discards a private response that arrives after another account signs in", async () => {
    const mock = installFetchMock();
    setTokens({ accessToken: "account-a", refreshToken: "refresh-a" });
    let release!: (response: Response) => void;
    mock.on("GET", "/api/v1/orders", () => new Promise<Response>((resolve) => { release = resolve; }));
    const request = apiFetch("/api/v1/orders");
    const rejected = expect(request).rejects.toMatchObject({ status: 401 });

    await clearSession();
    setTokens({ accessToken: "account-b", refreshToken: "refresh-b" });
    release(jsonResponse(200, { content: [{ id: 1, owner: "account-a" }] }));

    await rejected;
    expect(getAccessToken()).toBe("account-b");
  });

  it("cannot restore the old account when an in-flight refresh finishes after logout", async () => {
    const mock = installFetchMock();
    setTokens({ accessToken: "stale-a", refreshToken: "refresh-a" });
    let release!: (response: Response) => void;
    let refreshStarted!: () => void;
    const started = new Promise<void>((resolve) => { refreshStarted = resolve; });
    mock.on("GET", "/api/v1/orders", () => jsonResponse(401));
    mock.on("POST", "/api/v1/auth/refresh", () => new Promise<Response>((resolve) => {
      release = resolve;
      refreshStarted();
    }));
    const request = apiFetch("/api/v1/orders");
    const rejected = expect(request).rejects.toMatchObject({ status: 401 });
    await started;

    const loggedOut = clearSession();
    release(jsonResponse(200, { accessToken: "new-a", refreshToken: "rotated-a" }));

    await rejected;
    await loggedOut;
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(mock.sent("GET", "/api/v1/orders")).toHaveLength(1);
  });

  it("does not retry A's operation as B when the storage event has not been delivered", async () => {
    const mock = installFetchMock();
    setTokens({ accessToken: "account-a", refreshToken: "refresh-a" });
    let release!: (response: Response) => void;
    mock.on("GET", "/api/v1/orders", () => new Promise<Response>((resolve) => { release = resolve; }));
    const rejected = expect(apiFetch("/api/v1/orders")).rejects.toMatchObject({ status: 401 });
    window.localStorage.setItem("shopupu.refreshToken", "refresh-b");
    window.localStorage.setItem(sessionEventKey, "account-b-marker");
    release(jsonResponse(401));
    await rejected;
    expect(mock.sent("POST", "/api/v1/auth/refresh")).toHaveLength(0);
    expect(mock.sent("GET", "/api/v1/orders")).toHaveLength(1);
    expect(getRefreshToken()).toBe("refresh-b");
  });

  it("does not overwrite another tab's session with a late refresh response", async () => {
    const mock = installFetchMock();
    setTokens({ accessToken: "stale-a", refreshToken: "refresh-a" });
    let release!: (response: Response) => void;
    let started!: () => void;
    const refreshing = new Promise<void>((resolve) => { started = resolve; });
    mock.on("GET", "/api/v1/orders", () => jsonResponse(401));
    mock.on("POST", "/api/v1/auth/refresh", () => new Promise<Response>((resolve) => {
      release = resolve;
      started();
    }));
    const rejected = expect(apiFetch("/api/v1/orders")).rejects.toMatchObject({ status: 401 });
    await refreshing;
    window.localStorage.setItem("shopupu.refreshToken", "refresh-b");
    window.localStorage.setItem(sessionEventKey, "account-b-marker");
    release(jsonResponse(200, { accessToken: "new-a", refreshToken: "rotated-a" }));
    await rejected;
    expect(getRefreshToken()).toBe("refresh-b");
    expect(mock.sent("GET", "/api/v1/orders")).toHaveLength(1);
  });

  it("ignores queued notifications for a shared identity already observed", () => {
    window.localStorage.setItem(sessionEventKey, "latest-account");
    captureSession();
    const version = getSessionVersion();
    setTokens({ accessToken: "fresh", refreshToken: "rotated" });
    syncSessionFromStorage(new StorageEvent("storage", { key: sessionEventKey, newValue: "earlier-account" }));
    syncSessionFromStorage(new StorageEvent("storage", { key: sessionEventKey, newValue: "latest-account" }));
    expect(getSessionVersion()).toBe(version);
    expect(getAccessToken()).toBe("fresh");
    expect(getRefreshToken()).toBe("rotated");
  });
});

describe("idempotency keys", () => {
  beforeEach(() => clearSession());

  it("sets the Idempotency-Key header on checkout-style calls", async () => {
    const mock = installFetchMock();
    mock.on("POST", "/api/v1/orders/checkout", () => jsonResponse(200, { id: 1 }));

    await apiJson("/api/v1/orders/checkout", { promoCode: null }, { idempotencyKey: "key-123" });

    expect(mock.requests[0].headers.get("Idempotency-Key")).toBe("key-123");
  });

  it("newIdempotencyKey issues unique UUIDs", () => {
    const first = newIdempotencyKey();
    const second = newIdempotencyKey();
    expect(first).not.toBe(second);
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });
});

describe("problem responses", () => {
  beforeEach(() => clearSession());

  it("joins field validation errors into the message", async () => {
    const mock = installFetchMock();
    mock.on("POST", "/api/v1/auth/register", () =>
      jsonResponse(400, {
        status: 400,
        errors: [
          { field: "email", message: "must be a well-formed email address" },
          { field: "password", message: "size must be between 8 and 72" }
        ]
      })
    );

    await expect(apiJson("/api/v1/auth/register", {}, { auth: false })).rejects.toThrow(
      "email: must be a well-formed email address; password: size must be between 8 and 72"
    );
  });

  it("translates 429 into a friendly rate-limit message", async () => {
    const mock = installFetchMock();
    mock.on("GET", "/api/v1/catalog/products", () => jsonResponse(429, {}));

    await expect(apiFetch("/api/v1/catalog/products", { auth: false })).rejects.toThrow(
      "Too many requests - please slow down and try again shortly."
    );
  });
});
