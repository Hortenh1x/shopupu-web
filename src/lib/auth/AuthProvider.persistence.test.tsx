import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/lib/auth/AuthProvider";
import { QueryProvider } from "@/lib/query/QueryProvider";
import { clearSession, getSessionVersion, setCurrentUser, setTokens, waitForSessionChange } from "@/lib/auth/session";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
function Status() { const auth = useAuth(); return <><p>{auth.isReady ? "Ready" : "Restoring"}</p><p>{auth.user?.email ?? "Signed out"}</p><button onClick={auth.logout}>Logout</button></>; }

describe("unavailable persistent authentication", () => {
  it("settles sign-out and renders one actionable error without a restore/remount loop", async () => {
    await clearSession();
    setTokens({ accessToken: "a-access", refreshToken: "a-refresh" });
    setCurrentUser({ id: 1, email: "a@example.invalid", roles: ["CUSTOMER"], enabled: true, emailVerified: false });
    const locks = navigator.locks;
    // Use a user with no refresh so the test cannot dispatch an external logout.
    window.localStorage.removeItem("shopupu.refreshToken");
    Object.defineProperty(navigator, "locks", { configurable: true, value: undefined });
    try {
      render(<QueryProvider><AuthProvider><Status /></AuthProvider></QueryProvider>);
      fireEvent.click(screen.getByRole("button", { name: "Logout" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("HTTPS or localhost");
      await screen.findByText("Signed out");
      await screen.findByText("Ready");
      const settledVersion = getSessionVersion();
      await act(async () => { await waitForSessionChange(); await waitForSessionChange(); });
      await waitFor(() => expect(getSessionVersion()).toBe(settledVersion));
      expect(screen.getAllByRole("alert")).toHaveLength(1);
    } finally { Object.defineProperty(navigator, "locks", { configurable: true, value: locks }); }
  });
});
