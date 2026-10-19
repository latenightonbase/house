"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquareQuote } from "lucide-react";
import { Avatar, Tabs, type TabItem } from "@/components/ui";
import { StarRating } from "@/components/reviews/Stars";
import {
  formatDate,
  type PublicReview,
  type RatingSummary,
  type ReviewRole,
  type ReviewSummary,
} from "@/lib/profileHistory";

function counted(label: string, count: number) {
  return count ? (
    <span className="inline-flex items-center gap-1.5">
      {label}
      <span className="numeric text-[11px] font-semibold opacity-60">{count}</span>
    </span>
  ) : (
    label
  );
}

function Summary({ label, summary }: { label: string; summary: RatingSummary }) {
  return (
    <div className="tile min-w-0 flex-1 px-4 py-3">
      <p className="panel-label">{label}</p>
      {summary.average != null ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="numeric text-[20px] font-bold leading-none text-white">
            {summary.average.toFixed(1)}
          </span>
          <StarRating value={summary.average} size={13} />
          <span className="text-[11px] text-caption">
            {summary.count} {summary.count === 1 ? "review" : "reviews"}
          </span>
        </div>
      ) : (
        <p className="mt-1.5 text-[12px] text-caption">No reviews yet</p>
      )}
    </div>
  );
}

function ReviewCard({ review }: { review: PublicReview }) {
  const { reviewer } = review;
  return (
    <li className="rounded-xl border border-line bg-surface-2 px-4 py-3.5">
      <div className="flex items-start gap-3">
        <Avatar
          src={reviewer.avatarUrl}
          alt={reviewer.name}
          fallbackSeed={reviewer.wallet ?? reviewer.name}
          fallback={reviewer.name.slice(0, 2).toUpperCase()}
          size={30}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="min-w-0 truncate text-[12px] font-semibold text-white">
              {reviewer.username ? (
                <Link
                  href={`/user/${reviewer.username}`}
                  className="transition-colors hover:text-primary-bright"
                >
                  {reviewer.name}
                </Link>
              ) : (
                reviewer.name
              )}
            </p>
            <StarRating value={review.rating} size={12} />
          </div>
          <p className="mt-0.5 truncate text-[11px] text-caption">
            {review.listingId ? (
              <Link
                href={`/listings/${review.listingId}`}
                className="transition-colors hover:text-white"
              >
                {review.listingTitle}
              </Link>
            ) : (
              review.listingTitle
            )}{" "}
            · {formatDate(review.createdAt)}
          </p>
          {review.comment && (
            <p className="mt-2 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-white/85">
              {review.comment}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * What people who traded with this account said about it, split by the side
 * of the deal it was on — a great seller can still be a slow payer. Only
 * buyers and sellers of a completed sale can leave one, so every review here
 * stands behind a real transaction.
 */
export function ReviewsSection({
  summary,
  reviews,
  isOwnProfile = false,
}: {
  summary: ReviewSummary;
  reviews: PublicReview[];
  isOwnProfile?: boolean;
}) {
  const [role, setRole] = useState<ReviewRole>(
    summary.asSeller.count === 0 && summary.asBuyer.count > 0 ? "BUYER" : "SELLER",
  );
  const tabs: TabItem<ReviewRole>[] = [
    { value: "SELLER", label: counted("As seller", summary.asSeller.count) },
    { value: "BUYER", label: counted("As buyer", summary.asBuyer.count) },
  ];
  const shown = reviews.filter((review) => review.revieweeRole === role);

  return (
    <section id="reviews" className="card scroll-mt-24 p-4 sm:p-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <h2 className="panel-label text-primary-light">Reviews</h2>
        <div className="sm:ml-auto">
          <Tabs items={tabs} value={role} onChange={setRole} />
        </div>
      </header>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Summary label="As a seller" summary={summary.asSeller} />
        <Summary label="As a buyer" summary={summary.asBuyer} />
      </div>

      {shown.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-line px-5 py-8 text-center">
          <MessageSquareQuote className="mx-auto h-5 w-5 text-caption" aria-hidden="true" />
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-caption">
            {isOwnProfile
              ? role === "SELLER"
                ? "No reviews as a seller yet. Buyers can rate you once a sale of yours completes."
                : "No reviews as a buyer yet. Sellers can rate you after you buy or win from them."
              : role === "SELLER"
                ? "Nobody has reviewed this account as a seller yet."
                : "Nobody has reviewed this account as a buyer yet."}
          </p>
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {shown.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </ul>
      )}
    </section>
  );
}
