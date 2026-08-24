"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AdminShell } from "@/features/admin/AdminShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { adminApi } from "@/lib/api/shop";

export default function Page() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("PENDING");
  const params = new URLSearchParams({ page: "0", size: "50" });
  if (status) params.set("status", status);
  const reviews = useQuery({ queryKey: ["admin-reviews", params.toString()], queryFn: () => adminApi.reviews(params) });
  const updateStatus = useMutation({
    mutationFn: ({ id, nextStatus }: { id: number; nextStatus: string }) => adminApi.updateReviewStatus(id, nextStatus),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-reviews"] })
  });
  const remove = useMutation({
    mutationFn: adminApi.deleteReview,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-reviews"] })
  });

  return (
    <AdminShell title="Review moderation">
      <div className="card toolbar">
        <label className="label">
          Status
          <select className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="DELETED">Deleted</option>
          </select>
        </label>
      </div>
      {reviews.error ? <p className="errorText">{(reviews.error as Error).message}</p> : null}
      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Product</th>
            <th>User</th>
            <th>Rating</th>
            <th>Review</th>
            <th>Status</th>
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
                      Approve
                    </button>
                  ) : null}
                  {review.status !== "REJECTED" ? (
                    <button
                      className="button buttonSmall"
                      disabled={updateStatus.isPending}
                      onClick={() => updateStatus.mutate({ id: review.id, nextStatus: "REJECTED" })}
                    >
                      Reject
                    </button>
                  ) : null}
                  <button className="button buttonRed buttonSmall" disabled={remove.isPending} onClick={() => remove.mutate(review.id)}>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {!reviews.data?.content?.length ? (
            <tr>
              <td colSpan={7} className="muted">
                Nothing to moderate.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </AdminShell>
  );
}
