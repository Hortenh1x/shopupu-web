import { act, renderHook, waitFor } from "@testing-library/react";
import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { useSessionMutation } from "@/lib/auth/useSessionMutation";
import { clearSession, getAccessToken, setTokens } from "@/lib/auth/session";

function gate() { let release!: () => void; const promise = new Promise<void>((resolve) => { release = resolve; }); return { promise, release }; }
function wrapper(client: QueryClient) { return function Provider({ children }: { children: ReactNode }) { return <QueryClientProvider client={client}>{children}</QueryClientProvider>; }; }
async function accountB() { await clearSession(); setTokens({ accessToken: "access-b", refreshToken: "refresh-b" }); }

beforeEach(async () => { await clearSession(); setTokens({ accessToken: "access-a", refreshToken: "refresh-a" }); });

describe("mutations stay bound to the initiating session", () => {
  it("rejects an operation queued before B signs in, before any HTTP request", async () => {
    const queued = gate(); const entered = vi.fn(); const request = vi.fn(async () => ({ id: 10 }));
    const client = new QueryClient({ mutationCache: new MutationCache({ onMutate: async () => { entered(); await queued.promise; } }) });
    const { result } = renderHook(() => useSessionMutation({ mutationFn: request }), { wrapper: wrapper(client) });
    act(() => result.current.mutate());
    await waitFor(() => expect(entered).toHaveBeenCalled());
    await act(async () => { await accountB(); queued.release(); });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(request).not.toHaveBeenCalled(); expect(getAccessToken()).toBe("access-b");
  });

  it("suppresses late checkout navigation and late erasure logout, including per-call callbacks", async () => {
    const settled = gate(); const entered = vi.fn(); const redirect = vi.fn(); const logoutB = vi.fn();
    const client = new QueryClient({ mutationCache: new MutationCache({ onSuccess: async () => { entered(); await settled.promise; } }) });
    const { result } = renderHook(() => useSessionMutation({ mutationFn: async () => ({ id: 10 }), onSuccess: redirect, onSettled: logoutB }), { wrapper: wrapper(client) });
    const perCall = vi.fn();
    act(() => result.current.mutate(undefined, { onSuccess: perCall, onSettled: perCall }));
    await waitFor(() => expect(entered).toHaveBeenCalled());
    await act(async () => { await accountB(); client.clear(); settled.release(); });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(redirect).not.toHaveBeenCalled(); expect(logoutB).not.toHaveBeenCalled(); expect(perCall).not.toHaveBeenCalled();
    expect(getAccessToken()).toBe("access-b");
  });

  it("blocks the second shipping request and private download after an awaited first step", async () => {
    const first = gate(); const entered = vi.fn(); const secondRequest = vi.fn(); const download = vi.fn();
    const client = new QueryClient();
    const { result } = renderHook(() => useSessionMutation({ mutationFn: async (_: void, context) => {
      entered(); await first.promise;
      context.assertCurrent(); secondRequest(); download();
    } }), { wrapper: wrapper(client) });
    act(() => result.current.mutate());
    await waitFor(() => expect(entered).toHaveBeenCalled());
    await act(async () => { await accountB(); first.release(); });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(secondRequest).not.toHaveBeenCalled(); expect(download).not.toHaveBeenCalled();
  });

  it("still delivers current-session success callbacks", async () => {
    const success = vi.fn(); const perCall = vi.fn(); const client = new QueryClient();
    const { result } = renderHook(() => useSessionMutation({ mutationFn: async (value: number) => value + 1, onSuccess: success }), { wrapper: wrapper(client) });
    act(() => result.current.mutate(4, { onSuccess: perCall }));
    await waitFor(() => expect(result.current.data).toBe(5));
    expect(success).toHaveBeenCalled(); expect(perCall).toHaveBeenCalled();
  });
  it("suppresses both error callbacks when the error cache hook outlives A", async () => {
    const delayed = gate(); const entered = vi.fn(); const onError = vi.fn(); const onSettled = vi.fn(); const perCall = vi.fn();
    const client = new QueryClient({ mutationCache: new MutationCache({ onError: async () => { entered(); await delayed.promise; } }) });
    const { result } = renderHook(() => useSessionMutation({ mutationFn: async () => { throw new Error("A-only failure"); }, onError, onSettled }), { wrapper: wrapper(client) });
    act(() => result.current.mutate(undefined, { onError: perCall, onSettled: perCall }));
    await waitFor(() => expect(entered).toHaveBeenCalled());
    await act(async () => { await accountB(); delayed.release(); });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(onError).not.toHaveBeenCalled(); expect(onSettled).not.toHaveBeenCalled(); expect(perCall).not.toHaveBeenCalled();
  });

});
