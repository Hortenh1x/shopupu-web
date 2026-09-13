"use client";

import { useSessionQuery } from "@/lib/auth/useSessionQuery";
import { useSessionMutation } from "@/lib/auth/useSessionMutation";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { AdminShell } from "@/features/admin/AdminShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { adminApi } from "@/lib/api/shop";
import { ReviewSourceBadge } from "@/features/reviews/ReviewSourceBadge";
import { useI18n } from "@/lib/i18n/LocaleProvider";

const STATUSES = ["PENDING", "APPROVED", "REJECTED", "DELETED"];

export default function Page() {
  const { t, errorMessage, statusLabel } = useI18n();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("PENDING");
  const params = new URLSearchParams({ page: "0", size: "50" });
  if (status) params.set("status", status);
  const reviews = useSessionQuery({ queryKey: ["admin-reviews", params.toString()], queryFn: () => adminApi.reviews(params) });
  const updateStatus = useSessionMutation({
    mutationFn: ({ id, nextStatus }: { id: number; nextStatus: string }) => adminApi.updateReviewStatus(id, nextStatus),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-reviews"] })
  });
  const remove = useSessionMutation({
    mutationFn: adminApi.deleteReview,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-reviews"] })
  });

  return (
    <AdminShell title={t("admin.reviewModeration")}>
      <div className="card toolbar">
        <label className="label">
          {t("admin.status")}
          <select className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">{t("admin.all")}</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {statusLabel(value)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {reviews.error ? <p className="errorText">{errorMessage(reviews.error)}</p> : null}
      {remove.error ? <p className="errorText">{errorMessage(remove.error)}</p> : null}
      <table className="table">
        <thead>
          <tr>
            <th>{t("admin.id")}</th>
            <th>{t("admin.product")}</th>
            <th>{t("admin.user")}</th>
            <th>{t("common.ratingLabel")}</th>
            <th>{t("admin.review")}</th>
            <th>{t("admin.status")}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {reviews.data?.content?.map((review) => (
            <tr key={review.id}>
              <td>{review.id}</td>
              <td>{review.productTitle ?? review.productId}</td>
              <td className="muted">{review.userEmail ?? review.userId}</td>
              <td>{review.rating}</td>
              <td>
                <ReviewSourceBadge source={review.source} />
                <p className="muted" style={{ margin: 0 }}>
                  {review.body.length > 140 ? `${review.body.slice(0, 140)}...` : review.body}
                </p>
              </td>
              <td>
                <StatusBadge value={review.status} />
              </td>
              <td>
                <div className="toolbar">
                  {review.status !== "APPROVED" ? (
                    <button
                      className="button buttonGreen buttonSmall"
                      disabled={updateStatus.isPending}
                      onClick={() => updateStatus.mutate({ id: review.id, nextStatus: "APPROVED" })}
                    >
                      {t("admin.approve")}
                    </button>
                  ) : null}
                  {review.status !== "REJECTED" ? (
                    <button
                      className="button buttonSmall"
                      disabled={updateStatus.isPending}
                      onClick={() => updateStatus.mutate({ id: review.id, nextStatus: "REJECTED" })}
                    >
                      {t("admin.reject")}
                    </button>
                  ) : null}
                  <ConfirmButton
                    className="button buttonRed buttonSmall"
                    label={t("common.delete")}
                    confirmLabel={t("common.confirmDelete")}
                    disabled={remove.isPending}
                    onConfirm={() => remove.mutate(review.id)}
                  />
                </div>
              </td>
            </tr>
          ))}
          {!reviews.data?.content?.length ? (
            <tr>
              <td colSpan={7} className="muted">
                {t("admin.nothingToModerate")}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </AdminShell>
  );
}
