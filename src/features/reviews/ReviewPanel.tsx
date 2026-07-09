"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { RatingStars } from "@/components/ui/RatingStars";
import { ApiError } from "@/lib/api/client";
import { aiApi, catalogApi, reviewApi } from "@/lib/api/shop";
import { useAuth } from "@/lib/auth/AuthProvider";

const reviewSchema = z.object({
  rating: z.coerce.number().min(1).max(5),
  title: z.string().min(2).max(160),
  body: z.string().min(5).max(5000)
});

type ReviewFormInput = z.input<typeof reviewSchema>;
type ReviewForm = z.output<typeof reviewSchema>;

function ReviewSummaryCard({ productId }: { productId: number }) {
  // 404 until the backend has generated a summary - silently show nothing
  const summary = useQuery({
    queryKey: ["review-summary", productId],
    queryFn: () => aiApi.reviewSummary(productId),
    retry: false,
    staleTime: 5 * 60_000
  });

  const data = summary.data;
  if (!data || (!data.tldr && !data.pros?.length && !data.cons?.length)) return null;

  return (
    <div className="aiSummary">
      <span className="kicker">What buyers say · AI summary</span>
      {data.tldr ? (
        <p className="subtitle" style={{ margin: 0 }}>
          {data.tldr}
        </p>
      ) : null}
      {data.pros?.length ? (
        <ul>
          {data.pros.map((pro) => (
            <li key={pro} className="pro">
              {pro}
            </li>
          ))}
        </ul>
      ) : null}
      {data.cons?.length ? (
        <ul>
          {data.cons.map((con) => (
            <li key={con} className="con">
              {con}
            </li>
          ))}
        </ul>
      ) : null}
      <span className="mono muted" style={{ fontSize: "0.78rem" }}>
        Based on {data.basedOnReviews} approved review{data.basedOnReviews === 1 ? "" : "s"}
        {data.sentiment ? ` · reads ${data.sentiment.toLowerCase()}` : ""}
      </span>
    </div>
  );
}

export function ReviewPanel({ productId }: { productId: number }) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const summary = useQuery({ queryKey: ["rating", productId], queryFn: () => catalogApi.rating(productId) });
  const reviews = useQuery({ queryKey: ["reviews", productId], queryFn: () => catalogApi.reviews(productId) });
  const form = useForm<ReviewFormInput, unknown, ReviewForm>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 5, title: "", body: "" }
  });
  const createReview = useMutation({
    mutationFn: (values: ReviewForm) => reviewApi.create(productId, values),
    onSuccess: async () => {
      form.reset({ rating: 5, title: "", body: "" });
      await queryClient.invalidateQueries({ queryKey: ["reviews", productId] });
    }
  });
  const deleteReview = useMutation({
    mutationFn: (reviewId: number) => reviewApi.remove(reviewId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reviews", productId] });
      await queryClient.invalidateQueries({ queryKey: ["rating", productId] });
    }
  });

  const rating = Number(summary.data?.averageRating ?? 0);
  const reviewCount = summary.data?.reviewCount ?? 0;
  const formRating = Number(form.watch("rating") ?? 5);

  return (
    <section className="section split">
      <div className="stack">
        <div className="railHeader" style={{ marginBottom: 0 }}>
          <h2 className="title">Reviews.</h2>
          {reviewCount > 0 ? (
            <span className="toolbar" style={{ gap: 10, justifySelf: "end" }}>
              <RatingStars value={rating} />
              <span className="mono muted" style={{ fontSize: "0.88rem" }}>
                {rating.toFixed(1)} · {reviewCount} review{reviewCount === 1 ? "" : "s"}
              </span>
            </span>
          ) : null}
        </div>

        <ReviewSummaryCard productId={productId} />

        {reviews.data?.content?.length ? (
          reviews.data.content.map((review) => (
            <article key={review.id} className="card stack" style={{ gap: 10 }}>
              <span className="toolbar" style={{ gap: 10 }}>
                <RatingStars value={review.rating} />
                <strong style={{ fontFamily: "var(--font-head)" }}>{review.title}</strong>
              </span>
              <p style={{ margin: 0 }}>{review.body}</p>
              <span className="mono muted" style={{ fontSize: "0.8rem" }}>
                {review.username}
              </span>
              {auth.user && review.userId === auth.user.id ? (
                <button
                  className="button buttonRed buttonSmall"
                  style={{ justifySelf: "start" }}
                  disabled={deleteReview.isPending}
                  onClick={() => deleteReview.mutate(review.id)}
                >
                  Delete my review
                </button>
              ) : null}
            </article>
          ))
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            No approved reviews yet. Bought this? Yours could be the first.
          </p>
        )}
      </div>

      <aside className="card stack" style={{ padding: 24 }}>
        <h3 className="subtitle" style={{ margin: 0 }}>
          Write a review.
        </h3>
        {!auth.isAuthenticated ? (
          <p className="muted" style={{ margin: 0 }}>
            Sign in to review this product. Reviews are open to verified buyers.
          </p>
        ) : createReview.isSuccess ? (
          <p className="status statusOk" style={{ margin: 0 }}>
            Sent for moderation. It appears once approved.
          </p>
        ) : (
          <form className="stack" onSubmit={form.handleSubmit((values) => createReview.mutate(values))}>
            <div className="stack" style={{ gap: 7 }}>
              <span className="kicker">Rating</span>
              <RatingStars
                value={formRating}
                onChange={(value) => form.setValue("rating", value, { shouldValidate: true })}
              />
            </div>
            <label className="label">
              Title
              <input className="input" {...form.register("title")} />
            </label>
            <label className="label">
              Review
              <textarea className="textarea" {...form.register("body")} />
            </label>
            {createReview.error ? (
              <p className="errorText" style={{ margin: 0 }}>
                {createReview.error instanceof ApiError && createReview.error.status === 422
                  ? "Only verified buyers can review: you need a paid order containing this product."
                  : (createReview.error as Error).message}
              </p>
            ) : null}
            <button className="button buttonDark" disabled={createReview.isPending}>
              {createReview.isPending ? "Sending..." : "Send for moderation"}
            </button>
          </form>
        )}
      </aside>
    </section>
  );
}
