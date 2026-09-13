import { beforeEach, describe, expect, it, vi } from "vitest";
import { authApi, cartApi } from "@/lib/api/shop";
import { clearSession, captureSession, getCartToken, setCartToken, startSession } from "@/lib/auth/session";
import { installFetchMock, jsonResponse } from "@/test/fetchMock";

const buyer = { id: 7, email: "demo@example.invalid", roles: ["CUSTOMER"], emailVerified: false, enabled: true };

const emptyCart = { items: [], totalItems: 0, subtotal: 0 };

describe("guest cart token (CART-01/CART-02)", () => {
  beforeEach(async () => {
    await clearSession();
    setCartToken(null);
  });

  it("remembers the guest token issued with the first anonymous cart", async () => {
    const mock = installFetchMock();
    mock.on("GET", "/api/v1/cart", () => jsonResponse(200, { ...emptyCart, guestToken: "guest-1" }));

    await cartApi.get();

    // first call had no token yet, the issued one is stored for the next call
    expect(mock.requests[0].headers.get("X-Cart-Token")).toBeNull();
    expect(getCartToken()).toBe("guest-1");
  });

  it("echoes the stored token as X-Cart-Token on later cart calls", async () => {
    const mock = installFetchMock();
    setCartToken("guest-1");
    mock.on("POST", "/api/v1/cart/items", () =>
      jsonResponse(200, {
        items: [{ variantId: 5, productId: 2, title: "Tee", sku: "T-1", size: "M", price: 10, quantity: 1, lineTotal: 10 }],
        totalItems: 1,
        subtotal: 10,
        guestToken: "guest-1"
      })
    );

    await cartApi.add(5, 1);

    expect(mock.requests[0].headers.get("X-Cart-Token")).toBe("guest-1");
  });

  it("rides the guest token along with login so the backend can merge the cart", async () => {
    const mock = installFetchMock();
    setCartToken("guest-1");
    mock.on("POST", "/api/v1/auth/login", () => jsonResponse(200, { accessToken: "acc", refreshToken: "ref" }));

    await authApi.login("buyer@example.com", "secret123");

    const login = mock.sent("POST", "/api/v1/auth/login")[0];
    expect(login.headers.get("X-Cart-Token")).toBe("guest-1");
    expect(login.body).toEqual({ email: "buyer@example.com", password: "secret123" });
  });

  it("stops sending the token once it is forgotten after the merge", async () => {
    const mock = installFetchMock();
    setCartToken("guest-1");
    mock.on("GET", "/api/v1/cart", () => jsonResponse(200, emptyCart));

    await cartApi.forgetGuestToken();
    await cartApi.get();

    expect(getCartToken()).toBeNull();
    expect(mock.requests[0].headers.get("X-Cart-Token")).toBeNull();
  });
  it("does not let a late G response overwrite a new guest cart G2", async () => {
    setCartToken("guest-1");
    let release!: (response: Response) => void;
    const mock = installFetchMock();
    mock.on("GET", "/api/v1/cart", () => new Promise<Response>((resolve) => { release = resolve; }));
    const request = cartApi.get();
    const rejected = expect(request).rejects.toMatchObject({ problem: { code: "CART_CHANGED" } });
    await vi.waitFor(() => expect(release).toBeTypeOf("function"));
    setCartToken("guest-2");
    release(jsonResponse(200, { ...emptyCart, guestToken: "guest-1" }));
    await rejected;
    expect(getCartToken()).toBe("guest-2");
  });

  it("does not restore a spent guest token after another account is published", async () => {
    setCartToken("guest-1");
    let release!: (response: Response) => void;
    const mock = installFetchMock();
    mock.on("GET", "/api/v1/cart", () => new Promise<Response>((resolve) => { release = resolve; }));
    const request = cartApi.get();
    const rejected = expect(request).rejects.toMatchObject({ problem: { code: "SESSION_CHANGED" } });
    await vi.waitFor(() => expect(release).toBeTypeOf("function"));
    await startSession({ accessToken: "b-access", refreshToken: "b-refresh" }, buyer, captureSession(), undefined, "guest-1");
    release(jsonResponse(200, { ...emptyCart, guestToken: "guest-1" }));
    await rejected;
    expect(getCartToken()).toBeNull();
  });

  it("only forgets the guest token bound to the first authentication factor", async () => {
    setCartToken("guest-1");
    const original = getCartToken();
    setCartToken("guest-2");
    await startSession({ accessToken: "b-access", refreshToken: "b-refresh" }, buyer, captureSession(), undefined, original);
    expect(getCartToken()).toBe("guest-2");
  });

});
