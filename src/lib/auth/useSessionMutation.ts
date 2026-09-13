"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useMutation, type MutationFunctionContext, type MutateOptions, type UseMutationOptions, type UseMutationResult } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";
import { captureSession, getSessionVersion, isCurrentSession, subscribeSession, type SessionSnapshot } from "@/lib/auth/session";

export type SessionMutationContext = MutationFunctionContext & {
  session: SessionSnapshot;
  /** Call after every await before a second request or an external side effect. */
  assertCurrent: () => void;
};

type SessionMutationOptions<TData, TError, TVariables, TContext> =
  Omit<UseMutationOptions<TData, TError, TVariables, TContext>, "mutationFn" | "onMutate" | "onSuccess" | "onError" | "onSettled"> & {
    mutationFn: (variables: TVariables, context: SessionMutationContext) => Promise<TData>;
    onMutate?: (variables: TVariables, context: SessionMutationContext) => Promise<TContext> | TContext;
    onSuccess?: (data: TData, variables: TVariables, result: TContext, context: SessionMutationContext) => unknown;
    onError?: (error: TError, variables: TVariables, result: TContext | undefined, context: SessionMutationContext) => unknown;
    onSettled?: (data: TData | undefined, error: TError | null, variables: TVariables, result: TContext | undefined, context: SessionMutationContext) => unknown;
  };

type Submission<TData, TError, TVariables, TContext> = {
  input: TVariables;
  session: SessionSnapshot;
  generation: number;
  definition: SessionMutationOptions<TData, TError, TVariables, TContext>;
};

/** Capture at mutate entry; TanStack awaits cache hooks before onMutate/mutationFn. */
export function useSessionMutation<TData = unknown, TError = Error, TVariables = void, TContext = unknown>(
  options: SessionMutationOptions<TData, TError, TVariables, TContext>
): UseMutationResult<TData, TError, TVariables, TContext> {
  const generation = useSyncExternalStore(subscribeSession, getSessionVersion, () => 0);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  type Bound = Submission<TData, TError, TVariables, TContext>;

  function current(submission: Bound) {
    return mounted.current && submission.generation === submission.session.version && isCurrentSession(submission.session);
  }
  function context(submission: Bound, original: MutationFunctionContext): SessionMutationContext {
    return { ...original, session: submission.session, assertCurrent: () => {
      if (!current(submission)) throw new ApiError(401, "Your session changed. Please try again.", { code: "SESSION_CHANGED" });
    } };
  }

  const mutation = useMutation<TData, TError, Bound, TContext>({
    ...options,
    onMutate: async (submission, original) => {
      const guarded = context(submission, original);
      guarded.assertCurrent();
      const result = await submission.definition.onMutate?.(submission.input, guarded);
      guarded.assertCurrent();
      return result as TContext;
    },
    mutationFn: async (submission, original) => {
      const guarded = context(submission, original);
      guarded.assertCurrent();
      try {
        const result = await submission.definition.mutationFn(submission.input, guarded);
        guarded.assertCurrent();
        return result;
      } catch (error) {
        guarded.assertCurrent();
        throw error;
      }
    },
    onSuccess: async (data, submission, result, original) => {
      if (current(submission)) await submission.definition.onSuccess?.(data, submission.input, result, context(submission, original));
    },
    onError: async (error, submission, result, original) => {
      if (current(submission)) await submission.definition.onError?.(error, submission.input, result, context(submission, original));
    },
    onSettled: async (data, error, submission, result, original) => {
      if (current(submission)) await submission.definition.onSettled?.(data, error, submission.input, result, context(submission, original));
    }
  });

  function bind(input: TVariables): Bound {
    return { input, session: captureSession(), generation, definition: options };
  }
  function callOptions(submission: Bound, callbacks?: MutateOptions<TData, TError, TVariables, TContext>): MutateOptions<TData, TError, Bound, TContext> {
    return {
      onSuccess: (data, _variables, result, original) => {
        if (current(submission)) callbacks?.onSuccess?.(data, submission.input, result, context(submission, original));
      },
      onError: (error, _variables, result, original) => {
        if (current(submission)) callbacks?.onError?.(error, submission.input, result, context(submission, original));
      },
      onSettled: (data, error, _variables, result, original) => {
        if (current(submission)) callbacks?.onSettled?.(data, error, submission.input, result, context(submission, original));
      }
    };
  }
  const mutate = (input: TVariables, callbacks?: MutateOptions<TData, TError, TVariables, TContext>) => {
    const submission = bind(input);
    mutation.mutate(submission, callOptions(submission, callbacks));
  };
  const mutateAsync = async (input: TVariables, callbacks?: MutateOptions<TData, TError, TVariables, TContext>) => {
    const submission = bind(input);
    const data = await mutation.mutateAsync(submission, callOptions(submission, callbacks));
    if (!current(submission)) throw new ApiError(401, "Your session changed. Please try again.", { code: "SESSION_CHANGED" });
    return data;
  };

  return { ...mutation, variables: mutation.variables?.input, mutate, mutateAsync } as UseMutationResult<TData, TError, TVariables, TContext>;
}
