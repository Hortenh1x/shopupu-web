import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SecurityPanel } from "@/features/profile/SecurityPanel";
import { clearSession, getAccessToken, setTokens } from "@/lib/auth/session";
import { userApi } from "@/lib/api/shop";

const { logout } = vi.hoisted(() => ({ logout: vi.fn() }));
vi.mock("@/lib/auth/AuthProvider", () => ({ useAuth: () => ({ logout }) }));
beforeEach(async () => { await clearSession(); setTokens({ accessToken: "access-a", refreshToken: "refresh-a" }); logout.mockClear(); });

describe("private security action completion", () => {
  it("does not log B out when A's erasure callback finishes late", async () => {
    const deleted = vi.spyOn(userApi, "deleteAccount").mockResolvedValue(undefined);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const entered = vi.fn();
    const client = new QueryClient({ mutationCache: new MutationCache({ onSuccess: async () => { entered(); await gate; } }) });
    render(<QueryClientProvider client={client}><SecurityPanel /></QueryClientProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, delete permanently" }));
    await waitFor(() => expect(entered).toHaveBeenCalled());
    await act(async () => { await clearSession(); setTokens({ accessToken: "access-b", refreshToken: "refresh-b" }); client.clear(); release(); });
    await waitFor(() => expect(screen.getByRole("button", { name: "Yes, delete permanently" })).not.toBeDisabled());
    expect(deleted).toHaveBeenCalledTimes(1);
    expect(logout).not.toHaveBeenCalled();
    expect(getAccessToken()).toBe("access-b");
    deleted.mockRestore();
  });
});
