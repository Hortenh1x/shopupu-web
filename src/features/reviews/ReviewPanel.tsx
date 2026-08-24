"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { RatingStars } from "@/components/ui/RatingStars";
import { ApiError } from "@/lib/api/client";
import { aiApi, catalogApi, reviewApi } from "@/lib/api/shop";
import { useAuth } from "@/lib/auth/AuthProvider";

const REVIEWS_PAGE_SIZE = 6;

const reviewSchema = z.object({
  rating: z.coerce.number().min(1).max(5),
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
  // reviews load lazily: first page up front, the next page only when the
  // sentinel below the list scrolls into view
  const reviews = useInfiniteQuery({
    queryKey: ["reviews", productId],
    queryFn: ({ pageParam }) => catalogApi.reviews(productId, pageParam, REVIEWS_PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.number + 1)
  });
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = reviews;
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void fetchNextPage();
      },
      { rootMargin: "200px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  const loadedReviews = reviews.data?.pages.flatMap((page) => page.content) ?? [];
  const form = useForm<ReviewFormInput, unknown, ReviewForm>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 5, body: "" }
  });
  const createReview = useMutation({
    mutationFn: (values: ReviewForm) => reviewApi.create(productId, values),
    onSuccess: async () => {
      form.reset({ rating: 5, body: "" });
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

        {loadedReviews.length ? (
          loadedReviews.map((review) => (
            <article key={review.id} className="card stack" style={{ gap: 10 }}>
              <div className="stack" style={{ gap: 4 }}>
                <strong style={{ fontFamily: "var(--font-head)" }}>{review.username}</strong>
                <RatingStars value={review.rating} />
              </div>
              <p style={{ margin: 0 }}>{review.body}</p>
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
        {hasNextPage ? (
          <div ref={sentinelRef} aria-hidden style={{ height: 1 }} />
        ) : null}
        {isFetchingNextPage ? (
          <p className="muted" style={{ margin: 0, textAlign: "center" }}>
            Loading more reviews...
          </p>
        ) : null}
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
