"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi } from "@/lib/api/shop";
import type { TokenPairResponse, UserProfile } from "@/lib/api/types";
import { clearSession, getCurrentUser, getRefreshToken, setCurrentUser, setTokens } from "@/lib/auth/session";

type AuthContextValue = {
  user: UserProfile | null;
  isReady: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  reloadUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(getCurrentUser());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        if (getRefreshToken()) {
          await reloadUserInternal();
        }
      } catch {
        clearSession();
        setUser(null);
      } finally {
        if (active) setIsReady(true);
      }
    }
    restore();
    return () => {
      active = false;
    };
  }, []);

  async function applyTokens(tokens: TokenPairResponse) {
    setTokens(tokens);
    try {
      await reloadUserInternal();
    } catch (error) {
      clearSession();
      setUser(null);
      throw error;
    }
  }

  async function reloadUserInternal() {
    const profile = await authApi.me();
    setCurrentUser(profile);
    setUser(profile);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isReady,
      isAuthenticated: Boolean(user),
      isAdmin: user?.roles?.some((role) => role.toUpperCase() === "ADMIN") ?? false,
      login: async (email: string, password: string) => {
        await applyTokens(await authApi.login(email, password));
      },
      register: async (email: string, password: string) => {
        await applyTokens(await authApi.register(email, password));
      },
      logout: () => {
        clearSession();
        setUser(null);
        router.push("/login");
      },
      reloadUser: reloadUserInternal
    }),
    [isReady, router, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
