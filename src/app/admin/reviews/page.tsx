"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AdminShell } from "@/features/admin/AdminShell";
import { adminApi } from "@/lib/api/shop";

export default function Page() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
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
    <AdminShell title="Reviews">
      <div className="card toolbar">
        <label className="label">
          Status
          <select className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All</option>
            <option value="PUBLISHED">Published</option>
            <option value="HIDDEN">Hidden</option>
            <option value="DELETED">Deleted</option>
          </select>
        </label>
      </div>
      <table className="table">
        <thead><tr><th>ID</th><th>Product</th><th>User</th><th>Rating</th><th>Status</th><th /></tr></thead>
        <tbody>
          {reviews.data?.content?.map((review) => (
            <tr key={review.id}>
              <td>{review.id}</td>
              <td>{review.productTitle ?? review.productId}</td>
              <td>{review.userEmail ?? review.username}</td>
              <td>{review.rating}</td>
              <td><span className="status">{review.status}</span></td>
              <td>
                <div className="toolbar">
                  <button className="button" onClick={() => updateStatus.mutate({ id: review.id, nextStatus: "PUBLISHED" })}>Publish</button>
                  <button className="button" onClick={() => updateStatus.mutate({ id: review.id, nextStatus: "HIDDEN" })}>Hide</button>
                  <button className="button buttonRed" onClick={() => remove.mutate(review.id)}>Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminShell>
  );
}
