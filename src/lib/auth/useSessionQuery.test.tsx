import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { useSessionQuery } from "@/lib/auth/useSessionQuery";
import { clearSession, sessionEventKey, setTokens } from "@/lib/auth/session";
import { apiFetch } from "@/lib/api/client";
import { installFetchMock, jsonResponse } from "@/test/fetchMock";

function wrapper(client: QueryClient) { return function Provider({ children }: { children: ReactNode }) { return <QueryClientProvider client={client}>{children}</QueryClientProvider>; }; }
beforeEach(async () => { await clearSession(); setTokens({ accessToken: "access-a", refreshToken: "refresh-a" }); });
function unpublishedStorageEventForB() {
  const marker = "account-b-marker";
  window.localStorage.setItem("shopupu.refreshToken", JSON.stringify({ token: "refresh-b", marker }));
  window.localStorage.setItem(sessionEventKey, marker);
  // Deliberately do not deliver the storage event to the mounted A observer.
}

describe("private query observer identity", () => {
  it("does not retry A's 500 response as B when B signs in during retry delay", async () => {
    vi.useFakeTimers();
    const client = new QueryClient({ defaultOptions: { queries: { retry: 1, retryDelay: 50_000 } } });
    try {
      const mock = installFetchMock();
      mock.on("GET", "/api/v1/orders/7", () => jsonResponse(500, { detail: "Temporary failure" }));
      const retryScheduled = vi.fn(() => 50_000);
      const { result } = renderHook(() => useSessionQuery({ queryKey: ["order", 7], queryFn: () => apiFetch("/api/v1/orders/7"), retryDelay: retryScheduled }), { wrapper: wrapper(client) });
      await act(async () => { await Promise.resolve(); });
      expect(retryScheduled).toHaveBeenCalledTimes(1);
      unpublishedStorageEventForB();
      await act(async () => { await vi.advanceTimersByTimeAsync(50_001); });
      expect(mock.requests).toHaveLength(1);
      expect(mock.requests[0].headers.get("Authorization")).toBe("Bearer access-a");
      expect(result.current.error).toMatchObject({ problem: { code: "SESSION_CHANGED" } });
    } finally { client.clear(); vi.useRealTimers(); }
  });

  it("discards a late private result even if the function does not use apiFetch", async () => {
    let release!: (data: { privateAddress: string }) => void;
    const request = vi.fn(() => new Promise<{ privateAddress: string }>((resolve) => { release = resolve; }));
    const client = new QueryClient();
    const { result } = renderHook(() => useSessionQuery({ queryKey: ["address"], queryFn: request }), { wrapper: wrapper(client) });
    await waitFor(() => expect(request).toHaveBeenCalled());
    unpublishedStorageEventForB();
    await act(async () => { release({ privateAddress: "A-only address" }); });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("preserves enabled false and allows an explicit current-session refetch", async () => {
    const request = vi.fn(async () => "current account data");
    const client = new QueryClient();
    const { result } = renderHook(() => useSessionQuery({ queryKey: ["address"], queryFn: request, enabled: false }), { wrapper: wrapper(client) });
    expect(request).not.toHaveBeenCalled();
    // Read `data` before refetching, as a rendering component would: TanStack only re-renders for tracked props.
    expect(result.current.data).toBeUndefined();
    await act(async () => { await result.current.refetch(); });
    await waitFor(() => expect(result.current.data).toBe("current account data"));
    expect(request).toHaveBeenCalledTimes(1);
  });
});
