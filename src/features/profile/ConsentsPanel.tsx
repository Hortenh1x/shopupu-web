"use client";

import { useI18n } from "@/lib/i18n/LocaleProvider";

import { useSessionQuery } from "@/lib/auth/useSessionQuery";
import { useSessionMutation } from "@/lib/auth/useSessionMutation";
import { useQueryClient } from "@tanstack/react-query";
import { userApi } from "@/lib/api/shop";
import type { ConsentType } from "@/lib/api/types";

const POLICY_VERSION = "v1";

export function ConsentsPanel() {
  const { t, errorMessage, formatDate } = useI18n();
  const CONSENTS: Array<{ type: ConsentType; label: string; hint: string }> = [
    { type: "MARKETING_EMAIL", label: t("profile.marketing"), hint: t("profile.marketingHint") },
    { type: "COOKIES_ANALYTICS", label: t("profile.analytics"), hint: t("profile.analyticsHint") },
    { type: "DATA_PROCESSING", label: t("profile.processing"), hint: t("profile.processingHint") }
  ];
  const queryClient = useQueryClient();
  const consents = useSessionQuery({ queryKey: ["consents"], queryFn: userApi.consents });
  const update = useSessionMutation({
    mutationFn: ({ type, granted }: { type: ConsentType; granted: boolean }) =>
      userApi.updateConsent(type, granted, POLICY_VERSION),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["consents"] })
  });

  const current = new Map(consents.data?.map((consent) => [consent.consentType, consent]));

  return (
    <div className="stack" style={{ maxWidth: 640 }}>
      <h2 className="subtitle" style={{ margin: 0 }}>
        {t("profile.tabConsents")}
      </h2>
      <p className="muted">{t("profile.consentJournal", { version: POLICY_VERSION })}</p>
      {consents.error ? <p className="errorText">{errorMessage(consents.error)}</p> : null}
      {CONSENTS.map(({ type, label, hint }) => {
        const state = current.get(type);
        return (
          <label key={type} className="card toolbar" style={{ justifyContent: "space-between", cursor: "pointer" }}>
            <div className="stack" style={{ gap: 4 }}>
              <strong>{label}</strong>
              <span className="muted">{hint}</span>
              {state?.createdAt ? (
                <span className="muted">
                  {t("profile.consentDecision", { decision: state.granted ? t("profile.granted") : t("profile.declined"), date: formatDate(state.createdAt, { dateStyle: "medium", timeStyle: "short" }), version: state.policyVersion })}
                </span>
              ) : (
                <span className="muted">{t("profile.noDecision")}</span>
              )}
            </div>
            <input
              type="checkbox"
              checked={state?.granted ?? false}
              disabled={update.isPending}
              onChange={(event) => update.mutate({ type, granted: event.target.checked })}
              style={{ width: 24, height: 24 }}
            />
          </label>
        );
      })}
      {update.error ? <p className="errorText">{errorMessage(update.error)}</p> : null}
    </div>
  );
}
