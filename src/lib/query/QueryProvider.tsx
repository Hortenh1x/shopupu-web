"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { getSessionVersion, subscribeSession, syncSessionFromStorage } from "@/lib/auth/session";

export function QueryProvider({ children }: { children: ReactNode }) {
  const version = useSyncExternalStore(subscribeSession, getSessionVersion, () => 0);
  // A whole cache belongs to one session generation. This also covers new private
  // queries whose keys a future feature might forget to prefix with a user ID.
  const client = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1
          }
        }
      }),
    [version]
  );

  useEffect(() => () => client.clear(), [client]);
  useEffect(() => {
    window.addEventListener("storage", syncSessionFromStorage);
    return () => window.removeEventListener("storage", syncSessionFromStorage);
  }, []);

  // React Query observers retain their original client. Remount the subtree so
  // no observer or local form/chat state can outlive its account boundary.
  return <QueryClientProvider key={version} client={client}>{children}</QueryClientProvider>;
}
