"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useQuery, useQueryClient, type QueryFunction, type QueryKey, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";
import { getSessionSnapshot, getSessionVersion, isCurrentSession, subscribeSession } from "@/lib/auth/session";

type SessionQueryOptions<TQueryFnData, TError, TData, TQueryKey extends QueryKey> =
  Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, "queryFn"> & {
    queryFn: QueryFunction<TQueryFnData, TQueryKey>;
  };

/** Bind private observers/refetches/retries to the session that rendered them. */
export function useSessionQuery<TQueryFnData = unknown, TError = Error, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey>(
  options: SessionQueryOptions<TQueryFnData, TError, TData, TQueryKey>
): UseQueryResult<TData, TError> {
  const client = useQueryClient();
  const generation = useSyncExternalStore(subscribeSession, getSessionVersion, () => 0);
  // Passive read: detecting an external change during rendering must not notify
  // other React components. The guard compares this marker with storage later.
  const session = getSessionSnapshot();
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const current = () => mounted.current && session.version === generation && isCurrentSession(session);
  const assertCurrent = () => {
    if (!current()) throw new ApiError(401, "Your session changed. Please try again.", { code: "SESSION_CHANGED" });
  };
  const configuredRetry = (options.retry ?? client.getDefaultOptions().queries?.retry ?? 3) as UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>["retry"];

  return useQuery<TQueryFnData, TError, TData, TQueryKey>({
    ...options,
    queryFn: async (context) => {
      assertCurrent();
      try {
        const data = await options.queryFn(context);
        assertCurrent();
        return data;
      } catch (error) {
        assertCurrent();
        throw error;
      }
    },
    retry: (failureCount, error) => {
      if (!current() || (error instanceof ApiError && error.problem?.code === "SESSION_CHANGED")) return false;
      if (typeof configuredRetry === "function") return configuredRetry(failureCount, error);
      return configuredRetry === true || (typeof configuredRetry === "number" && failureCount < configuredRetry);
    }
  });
}
