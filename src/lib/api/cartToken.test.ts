import { beforeEach, describe, expect, it } from "vitest";
import { authApi, cartApi } from "@/lib/api/shop";
import { clearSession, getCartToken, setCartToken } from "@/lib/auth/session";
import { installFetchMock, jsonResponse } from "@/test/fetchMock";

const emptyCart = { items: [], totalItems: 0, subtotal: 0 };

describe("guest cart token (CART-01/CART-02)", () => {
  beforeEach(() => {
    clearSession();
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

    cartApi.forgetGuestToken();
    await cartApi.get();

    expect(getCartToken()).toBeNull();
    expect(mock.requests[0].headers.get("X-Cart-Token")).toBeNull();
  });
});
