import { beforeEach, describe, expect, it } from "vitest";
import { ApiError, apiFetch, apiJson, newIdempotencyKey } from "@/lib/api/client";
import { clearSession, getAccessToken, getRefreshToken, setTokens } from "@/lib/auth/session";
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

  it("does not try to refresh when retryOnUnauthorized is off", async () => {
    const mock = installFetchMock();
    setTokens({ accessToken: "stale", refreshToken: "ref-old" });
    mock.on("GET", "/api/v1/auth/me", () => jsonResponse(401));

    await expect(apiFetch("/api/v1/auth/me", { retryOnUnauthorized: false })).rejects.toBeInstanceOf(ApiError);

    expect(mock.sent("POST", "/api/v1/auth/refresh")).toHaveLength(0);
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
