"use client";

import { useSessionMutation } from "@/lib/auth/useSessionMutation";
import { adminApi } from "@/lib/api/shop";
import { useI18n } from "@/lib/i18n/LocaleProvider";

const JOBS = [
  { key: "embeddings", title: "admin.ai.embeddingsTitle", description: "admin.ai.embeddingsBody", run: () => adminApi.backfillEmbeddings() },
  { key: "recommendations", title: "admin.ai.recsTitle", description: "admin.ai.recsBody", run: () => adminApi.recomputeRecommendations() },
  { key: "review-summaries", title: "admin.ai.summariesTitle", description: "admin.ai.summariesBody", run: () => adminApi.refreshReviewSummaries() }
] as const;

function JobRow({ job }: { job: (typeof JOBS)[number] }) {
  const { t, errorMessage } = useI18n();
  const trigger = useSessionMutation({ mutationFn: job.run });

  return (
    <div
      className="toolbar"
      style={{ justifyContent: "space-between", alignItems: "center", padding: "18px 0", gap: 16 }}
    >
      <div className="stack" style={{ gap: 4, flex: "1 1 380px" }}>
        <span className="subtitle" style={{ fontSize: "1.05rem" }}>
          {t(job.title)}
        </span>
        <span className="muted" style={{ fontSize: "0.92rem", maxWidth: "58ch" }}>
          {t(job.description)}
        </span>
        {trigger.error ? <span className="errorText">{errorMessage(trigger.error)}</span> : null}
      </div>
      <div className="toolbar" style={{ gap: 12 }}>
        {trigger.isSuccess ? <span className="status statusOk">{t("admin.ai.queued")}</span> : null}
        <button className="button" disabled={trigger.isPending} onClick={() => trigger.mutate()}>
          {trigger.isPending ? t("admin.ai.queuing") : t("admin.ai.run")}
        </button>
      </div>
    </div>
  );
}

export function AiAdminPanel() {
  const { t } = useI18n();
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="card" style={{ padding: "6px 24px" }}>
        {JOBS.map((job, index) => (
          <div key={job.key} style={index > 0 ? { borderTop: "1px solid var(--line)" } : undefined}>
            <JobRow job={job} />
          </div>
        ))}
      </div>
      <p className="muted" style={{ margin: 0, fontSize: "0.88rem", maxWidth: "72ch" }}>
        {t("admin.ai.note")}
      </p>
    </div>
  );
}
