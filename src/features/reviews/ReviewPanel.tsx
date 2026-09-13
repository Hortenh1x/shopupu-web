"use client";

import { useI18n } from "@/lib/i18n/LocaleProvider";
import { useSessionMutation } from "@/lib/auth/useSessionMutation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { RatingStars } from "@/components/ui/RatingStars";
import { ApiError } from "@/lib/api/client";
import { aiApi, catalogApi, reviewApi } from "@/lib/api/shop";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ReviewSourceBadge } from "./ReviewSourceBadge";

const REVIEWS_PAGE_SIZE = 6;

const reviewSchema = z.object({
  rating: z.coerce.number().min(1).max(5),
  body: z.string().min(5).max(5000)
});

type ReviewFormInput = z.input<typeof reviewSchema>;
type ReviewForm = z.output<typeof reviewSchema>;

function ReviewSummaryCard({ productId }: { productId: number }) {
  const { t, formatNumber } = useI18n();
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
      <span className="kicker">{t("review.summary")}</span>
      {data.tldr ? <p className="tldr">{data.tldr}</p> : null}
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
        {t(data.basedOnReviews === 1 ? "review.basedOne" : "review.basedMany", { count: formatNumber(data.basedOnReviews) })}
        {data.sentiment ? ` · ${t("review.sentiment", { sentiment: t(data.sentiment.toLowerCase() === "positive" ? "review.positive" : data.sentiment.toLowerCase() === "negative" ? "review.negative" : data.sentiment.toLowerCase() === "mixed" ? "review.mixed" : "review.neutral") })}` : ""}
      </span>
    </div>
  );
}

export function ReviewPanel({ productId }: { productId: number }) {
  const { t, formatNumber, errorMessage } = useI18n();
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
  const createReview = useSessionMutation({
    mutationFn: (values: ReviewForm) => reviewApi.create(productId, values),
    onSuccess: async () => {
      form.reset({ rating: 5, body: "" });
      await queryClient.invalidateQueries({ queryKey: ["reviews", productId] });
    }
  });
  const deleteReview = useSessionMutation({
    mutationFn: (reviewId: number) => reviewApi.remove(reviewId),
    onSuccess: async (_data, _variables, _result, context) => {
      await queryClient.invalidateQueries({ queryKey: ["reviews", productId] });
      context.assertCurrent();
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
          <h2 className="title">{t("review.title")}</h2>
          {reviewCount > 0 ? (
            <span className="toolbar" style={{ gap: 12, justifySelf: "end" }}>
              <RatingStars value={rating} />
              <span className="mono muted" style={{ fontSize: "0.88rem" }}>
                {t(reviewCount === 1 ? "product.reviewsOne" : "product.reviewsMany", { rating: formatNumber(rating, { minimumFractionDigits: 1, maximumFractionDigits: 1 }), count: formatNumber(reviewCount) })}
              </span>
            </span>
          ) : null}
        </div>

        <p className="muted">{t("review.notice")}</p>

        <p className="muted">{t("review.original")}</p>
        <ReviewSummaryCard productId={productId} />

        {reviews.isLoading ? <p role="status">{t("review.loading")}</p> : null}
        {reviews.error ? <div className="stack" role="alert"><p className="errorText">{errorMessage(reviews.error)}</p><button className="button" onClick={() => reviews.refetch()}>{t("review.retry")}</button></div> : null}
        {deleteReview.error ? <p className="errorText" role="alert">{errorMessage(deleteReview.error)}</p> : null}

        {loadedReviews.length ? (
          loadedReviews.map((review) => (
            <article key={review.id} className="card stack" style={{ gap: 12 }}>
              <div className="stack" style={{ gap: 4 }}>
                <strong style={{ fontFamily: "var(--font-head)" }}>{review.username}</strong>
                <RatingStars value={review.rating} />
                <ReviewSourceBadge source={review.source} />
              </div>
              <p style={{ margin: 0 }}>{review.body}</p>
              {auth.user && review.userId === auth.user.id ? (
                <ConfirmButton
                  className="button buttonRed buttonSmall"
                  label={t("review.delete")}
                  confirmLabel={t("common.confirmDelete")}
                  disabled={deleteReview.isPending}
                  onConfirm={() => deleteReview.mutate(review.id)}
                />
              ) : null}
            </article>
          ))
        ) : !reviews.isLoading && !reviews.error ? (
          <p className="muted" style={{ margin: 0 }}>
            {t("review.empty")}
          </p>
        ) : null}
        {hasNextPage ? (
          <div ref={sentinelRef} aria-hidden style={{ height: 1 }} />
        ) : null}
        {isFetchingNextPage ? (
          <p className="muted" style={{ margin: 0, textAlign: "center" }}>
            {t("review.more")}
          </p>
        ) : null}
      </div>

      <aside className="card stack" style={{ padding: 24 }}>
        <h3 className="subtitle" style={{ margin: 0 }}>
          {t("review.write")}
        </h3>
        {!auth.isAuthenticated ? (
          <p className="muted" style={{ margin: 0 }}>
            {t("review.signIn")}
          </p>
        ) : createReview.isSuccess ? (
          <p className="status statusOk" style={{ margin: 0 }}>
            {t("review.sent")}
          </p>
        ) : (
          <form className="stack" onSubmit={form.handleSubmit((values) => createReview.mutate(values))}>
            <div className="stack" style={{ gap: 8 }}>
              <span className="kicker">{t("common.ratingLabel")}</span>
              <RatingStars
                value={formRating}
                onChange={(value) => form.setValue("rating", value, { shouldValidate: true })}
              />
              {form.formState.errors.rating ? <span className="errorText" role="alert">{t("review.ratingError")}</span> : null}
            </div>
            <label className="label">
              {t("review.body")}
              <textarea className="textarea" aria-invalid={Boolean(form.formState.errors.body)} aria-describedby={form.formState.errors.body ? "review-body-error" : undefined} {...form.register("body")} />
              {form.formState.errors.body ? <span id="review-body-error" className="errorText" role="alert">{t("review.bodyError")}</span> : null}
            </label>
            {createReview.error ? (
              <p className="errorText" style={{ margin: 0 }}>
                {createReview.error instanceof ApiError && createReview.error.status === 422
                  ? t("review.purchaseError")
                  : errorMessage(createReview.error)}
              </p>
            ) : null}
            <button className="button buttonDark" disabled={createReview.isPending}>
              {createReview.isPending ? t("review.sending") : t("review.submit")}
            </button>
          </form>
        )}
      </aside>
    </section>
  );
}
