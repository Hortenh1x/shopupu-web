"use client";

import { useMutation } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/shop";

const JOBS = [
  {
    key: "embeddings",
    title: "Backfill product embeddings",
    description:
      "Generates vector embeddings for products that do not have one yet. Powers semantic search on the storefront.",
    run: () => adminApi.backfillEmbeddings()
  },
  {
    key: "recommendations",
    title: "Recompute recommendations",
    description:
      "Rebuilds the 'often bought together' pairs from paid orders. Product pages pick the result up immediately.",
    run: () => adminApi.recomputeRecommendations()
  },
  {
    key: "review-summaries",
    title: "Refresh review summaries",
    description:
      "Regenerates the AI 'what buyers say' summary for every product with enough approved reviews.",
    run: () => adminApi.refreshReviewSummaries()
  }
] as const;

function JobRow({ job }: { job: (typeof JOBS)[number] }) {
  const trigger = useMutation({ mutationFn: job.run });

  return (
    <div
      className="toolbar"
      style={{ justifyContent: "space-between", alignItems: "center", padding: "18px 0", gap: 16 }}
    >
      <div className="stack" style={{ gap: 4, flex: "1 1 380px" }}>
        <span className="subtitle" style={{ fontSize: "1.05rem" }}>
          {job.title}
        </span>
        <span className="muted" style={{ fontSize: "0.92rem", maxWidth: "58ch" }}>
          {job.description}
        </span>
        {trigger.error ? <span className="errorText">{(trigger.error as Error).message}</span> : null}
      </div>
      <div className="toolbar" style={{ gap: 10 }}>
        {trigger.isSuccess ? <span className="status statusOk">queued</span> : null}
        <button className="button" disabled={trigger.isPending} onClick={() => trigger.mutate()}>
          {trigger.isPending ? "Queuing..." : "Run now"}
        </button>
      </div>
    </div>
  );
}

export function AiAdminPanel() {
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
        Jobs run asynchronously on the backend AI pool and answer immediately with "queued". Every trigger
        is written to the audit trail. When AI is disabled server-side the storefront quietly falls back
        to keyword search and skips the AI blocks, so running these is always safe.
      </p>
    </div>
  );
}
