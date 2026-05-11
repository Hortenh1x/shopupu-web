"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { EmptyState } from "@/components/ui/EmptyState";

export function Protected({ adminOnly = false, children }: { adminOnly?: boolean; children: ReactNode }) {
  const auth = useAuth();

  if (!auth.isReady) {
    return <EmptyState title="Checking session" body="Loading account state." />;
  }

  if (!auth.isAuthenticated) {
    return (
      <EmptyState title="Login required" body="This page is available only after login.">
        <Link className="button buttonDark" href="/login">
          Login
        </Link>
      </EmptyState>
    );
  }

  if (adminOnly && !auth.isAdmin) {
    return <EmptyState title="403" body="Admin privileges are required." />;
  }

  return <>{children}</>;
}
