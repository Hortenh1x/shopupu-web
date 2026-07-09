"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { EmptyState } from "@/components/ui/EmptyState";

export function Protected({ adminOnly = false, children }: { adminOnly?: boolean; children: ReactNode }) {
  const auth = useAuth();

  if (!auth.isReady) {
    return (
      <main className="page">
        <EmptyState title="Checking session" body="Loading account state." />
      </main>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <main className="page">
        <EmptyState title="Sign in required" body="This page is available only after signing in.">
          <Link className="button buttonDark" href="/login">
            Sign in
          </Link>
        </EmptyState>
      </main>
    );
  }

  if (adminOnly && !auth.isAdmin) {
    return (
      <main className="page">
        <EmptyState title="No access" body="Admin privileges are required for this area." />
      </main>
    );
  }

  return <>{children}</>;
}
