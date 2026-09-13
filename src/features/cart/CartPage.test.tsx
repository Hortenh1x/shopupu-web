import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CartPage } from "@/features/cart/CartPage";
import { cartApi } from "@/lib/api/shop";
import type { Cart } from "@/lib/api/types";
import { clearSession, setTokens } from "@/lib/auth/session";

vi.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({ isReady: true, isAuthenticated: true, isAdmin: false, user: { id: 7 } })
}));

const line = { variantId: 11, productId: 1, title: "Oversized Cotton Hoodie", sku: "HOOD-M-BLK", size: "M", color: "black", price: 49.99 };

function cartWith(quantity: number): Cart {
  const items = quantity > 0 ? [{ ...line, quantity, lineTotal: Math.round(line.price * quantity * 100) / 100 }] : [];
  return { items, totalItems: quantity, subtotal: items[0]?.lineTotal ?? 0 };
}

function renderCart() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CartPage />
    </QueryClientProvider>
  );
}

const quantityCell = () => screen.getByRole("button", { name: "Increase quantity" }).previousElementSibling as HTMLElement;

beforeEach(async () => {
  await clearSession();
  setTokens({ accessToken: "access", refreshToken: "refresh" });
  vi.spyOn(cartApi, "get").mockResolvedValue(cartWith(1));
});

afterEach(() => vi.restoreAllMocks());

describe("cart quantity stepper", () => {
  it("answers every tap at once and sends a single write once the taps settle", async () => {
    const setQuantity = vi.spyOn(cartApi, "setQuantity").mockImplementation(async (_variantId, quantity) => cartWith(quantity));
    renderCart();
    await screen.findByText("Oversized Cotton Hoodie");

    const plus = screen.getByRole("button", { name: "Increase quantity" });
    fireEvent.click(plus);
    fireEvent.click(plus);

    // the number and the totals follow the taps before any request is made
    await waitFor(() => expect(quantityCell().textContent).toBe("3"));
    expect(screen.getByText("3 items")).toBeInTheDocument();
    expect(plus).not.toBeDisabled();
    expect(setQuantity).not.toHaveBeenCalled();

    await waitFor(() => expect(setQuantity).toHaveBeenCalledTimes(1));
    expect(setQuantity).toHaveBeenCalledWith(11, 3);
    await waitFor(() => expect(quantityCell().textContent).toBe("3"));
  });

  it("returns to server truth when the write is rejected", async () => {
    vi.spyOn(cartApi, "setQuantity").mockRejectedValue(new Error("out of stock"));
    const get = vi.spyOn(cartApi, "get").mockResolvedValue(cartWith(1));
    renderCart();
    await screen.findByText("Oversized Cotton Hoodie");

    fireEvent.click(screen.getByRole("button", { name: "Increase quantity" }));
    await waitFor(() => expect(quantityCell().textContent).toBe("2"));

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(quantityCell().textContent).toBe("1"));
    expect(await screen.findByText("out of stock")).toBeInTheDocument();
  });
});

describe("removing a cart line", () => {
  it("drops the line immediately and offers undo that re-adds it", async () => {
    const remove = vi.spyOn(cartApi, "remove").mockResolvedValue(cartWith(0));
    const add = vi.spyOn(cartApi, "add").mockResolvedValue(cartWith(1));
    renderCart();
    await screen.findByText("Oversized Cotton Hoodie");

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(screen.queryByText("Oversized Cotton Hoodie")).not.toBeInTheDocument());
    expect(screen.getByRole("status")).toHaveTextContent("Removed “Oversized Cotton Hoodie”.");
    await waitFor(() => expect(remove).toHaveBeenCalledWith(11));

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await waitFor(() => expect(add).toHaveBeenCalledWith(11, 1));
    expect(await screen.findByText("Oversized Cotton Hoodie")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
