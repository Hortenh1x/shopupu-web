"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { userApi } from "@/lib/api/shop";
import type { ConsentType } from "@/lib/api/types";

const POLICY_VERSION = "v1";

const CONSENTS: Array<{ type: ConsentType; label: string; hint: string }> = [
  { type: "MARKETING_EMAIL", label: "Marketing emails", hint: "News, sales and personal offers." },
  { type: "COOKIES_ANALYTICS", label: "Analytics cookies", hint: "Anonymous usage analytics." },
  { type: "DATA_PROCESSING", label: "Data processing", hint: "Processing profile data for recommendations." }
];

export function ConsentsPanel() {
  const queryClient = useQueryClient();
  const consents = useQuery({ queryKey: ["consents"], queryFn: userApi.consents });
  const update = useMutation({
    mutationFn: ({ type, granted }: { type: ConsentType; granted: boolean }) =>
      userApi.updateConsent(type, granted, POLICY_VERSION),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["consents"] })
  });

  const current = new Map(consents.data?.map((consent) => [consent.consentType, consent]));

  return (
    <div className="stack" style={{ maxWidth: 640 }}>
      <h2 className="subtitle" style={{ margin: 0 }}>
        Consents
      </h2>
      <p className="muted">Every change is recorded with a timestamp and the policy version ({POLICY_VERSION}).</p>
      {consents.error ? <p className="errorText">{(consents.error as Error).message}</p> : null}
      {CONSENTS.map(({ type, label, hint }) => {
        const state = current.get(type);
        return (
          <label key={type} className="card toolbar" style={{ justifyContent: "space-between", cursor: "pointer" }}>
            <div className="stack" style={{ gap: 4 }}>
              <strong>{label}</strong>
              <span className="muted">{hint}</span>
              {state?.createdAt ? (
                <span className="muted">
                  {state.granted ? "granted" : "declined"} on {new Date(state.createdAt).toLocaleString()} (policy{" "}
                  {state.policyVersion})
                </span>
              ) : (
                <span className="muted">no decision recorded</span>
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
      {update.error ? <p className="errorText">{(update.error as Error).message}</p> : null}
    </div>
  );
}
