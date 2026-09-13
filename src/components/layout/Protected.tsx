"use client";

import { useI18n } from "@/lib/i18n/LocaleProvider";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { EmptyState } from "@/components/ui/EmptyState";

export function Protected({ adminOnly = false, requiredRole, children }: { adminOnly?: boolean; requiredRole?: "ADMIN"; children: ReactNode }) {
  const { t } = useI18n();
  const auth = useAuth();

  if (!auth.isReady) {
    return (
      <main className="page">
        <EmptyState title={t("protected.checking")} body={t("protected.loading")} />
      </main>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <main className="page">
        <EmptyState title={t("protected.signIn")} body={t("protected.body")}>
          <Link className="button buttonDark" href="/login">
            {t("nav.signIn")}
          </Link>
        </EmptyState>
      </main>
    );
  }

  if ((adminOnly && !auth.isAdmin) || (requiredRole && !auth.user?.roles.includes(requiredRole))) {
    return (
      <main className="page">
        <EmptyState title={t("protected.denied")} body={t("protected.admin")} />
      </main>
    );
  }

  return <>{children}</>;
}
