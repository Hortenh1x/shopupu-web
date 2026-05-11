"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { RatingStars } from "@/components/ui/RatingStars";
import { useAuth } from "@/lib/auth/AuthProvider";
import { catalogApi, reviewApi } from "@/lib/api/shop";

const reviewSchema = z.object({
  rating: z.coerce.number().min(1).max(5),
  title: z.string().min(2).max(160),
  body: z.string().min(5).max(5000)
});

type ReviewFormInput = z.input<typeof reviewSchema>;
type ReviewForm = z.output<typeof reviewSchema>;

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
      await queryClient.invalidateQueries({ queryKey: ["rating", productId] });
    }
  });

  const rating = Number(summary.data?.averageRating ?? 0);

  return (
    <section className="section split">
      <div className="stack">
        <h2 className="title">Reviews</h2>
        <div className="card">
          <RatingStars value={rating} />
          <p className="muted">
            {rating.toFixed(2)} average / {summary.data?.reviewCount ?? 0} reviews
          </p>
        </div>
        {reviews.data?.content?.length ? (
          reviews.data.content.map((review) => (
            <article key={review.id} className="card stack">
              <RatingStars value={review.rating} />
              <strong>{review.title}</strong>
              <p>{review.body}</p>
              <span className="muted">by {review.username}</span>
            </article>
          ))
        ) : (
          <p className="muted">No reviews yet.</p>
        )}
      </div>

      <aside className="card stack">
        <h3 style={{ margin: 0 }}>Write review</h3>
        {!auth.isAuthenticated ? (
          <p className="muted">Login to review this product.</p>
        ) : (
          <form className="stack" onSubmit={form.handleSubmit((values) => createReview.mutate(values))}>
            <label className="label">
              Rating
              <select className="select" {...form.register("rating")}>
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="label">
              Title
              <input className="input" {...form.register("title")} />
            </label>
            <label className="label">
              Body
              <textarea className="textarea" {...form.register("body")} />
            </label>
            {createReview.error ? <p className="muted">{createReview.error.message}</p> : null}
            <button className="button buttonDark" disabled={createReview.isPending}>
              Publish
            </button>
          </form>
        )}
      </aside>
    </section>
  );
}
