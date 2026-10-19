"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button, TextArea, type ButtonSize, type ButtonVariant } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StarInput } from "@/components/reviews/Stars";
import {
  MAX_REVIEW_COMMENT,
  submitReview,
  type OwnReview,
  type ReviewRole,
} from "@/lib/profileHistory";

/**
 * "Rate" for one deal — the buyer rating a seller, or a seller rating their
 * buyer. Once rated it shows the stars given and reopens the same dialog to
 * edit them; the API keeps one review per side per deal.
 *
 * Compact by default (a star and "Rate", the word dropped on a phone) for
 * history rows; with `label` it is a prompt that always spells itself out —
 * "Rate the seller" after a purchase, say.
 */
export function ReviewButton({
  dealKey,
  /** Whoever is being rated, and which side of the deal they were on. */
  name,
  role,
  listingTitle,
  existing,
  onSaved,
  className,
  label,
  size = "sm",
  variant = "accent-outline",
}: {
  dealKey: string;
  name: string;
  role: ReviewRole;
  listingTitle: string;
  existing: OwnReview | null | undefined;
  onSaved?: (review: OwnReview) => void;
  className?: string;
  label?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
}) {
  const [review, setReview] = useState<OwnReview | null>(existing ?? null);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(review?.rating ?? 0);
  const [comment, setComment] = useState(review?.comment ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openDialog(next: boolean) {
    if (next) {
      setRating(review?.rating ?? 0);
      setComment(review?.comment ?? "");
      setError(null);
    }
    setOpen(next);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!rating) {
      setError("Pick a star rating.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const saved = await submitReview({ dealKey, rating, comment: comment.trim() || null });
      setReview(saved);
      setOpen(false);
      onSaved?.(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your review.");
    } finally {
      setBusy(false);
    }
  }

  const who = role === "SELLER" ? "seller" : "buyer";

  return (
    <>
      <Button
        variant={review ? "accent-outline" : variant}
        size={size}
        onClick={() => openDialog(true)}
        className={className}
        aria-label={review ? `Edit your ${review.rating}-star review of ${name}` : `Rate ${name}`}
      >
        <Star
          className={review ? "h-3.5 w-3.5 fill-warning text-warning" : "h-3.5 w-3.5"}
          aria-hidden="true"
        />
        {/* On a phone the star alone says it — the row also holds a name and
            the Message button. */}
        {review ? (
          label ? (
            <span>
              You rated <span className="numeric">{review.rating}</span>
            </span>
          ) : (
            <span className="numeric">{review.rating}</span>
          )
        ) : label ? (
          <span>{label}</span>
        ) : (
          <span className="max-sm:sr-only">Rate</span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={openDialog}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-md overflow-y-auto p-5 sm:p-6">
          <DialogHeader className="pr-10">
            <DialogTitle>
              {review ? "Edit your review" : `Rate the ${who}`}
            </DialogTitle>
            <DialogDescription>
              How did <span className="text-white">{name}</span> do as the {who} of{" "}
              <span className="text-white">{listingTitle}</span>? Your review shows on their
              public profile.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={save} className="mt-5 space-y-4">
            <StarInput value={rating} onChange={setRating} disabled={busy} />

            <div className="space-y-1.5">
              <label htmlFor={`review-${dealKey}`} className="panel-label">
                Comment <span className="normal-case tracking-normal font-normal">optional</span>
              </label>
              <TextArea
                id={`review-${dealKey}`}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                maxLength={MAX_REVIEW_COMMENT}
                placeholder={
                  role === "SELLER"
                    ? "Delivered on time, easy to work with…"
                    : "Paid promptly, clear about what they wanted…"
                }
                disabled={busy}
              />
              <p className="text-right text-[11px] text-caption numeric">
                {comment.length}/{MAX_REVIEW_COMMENT}
              </p>
            </div>

            {error && <p className="text-[12px] text-negative">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="accent-outline"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={busy || !rating}>
                {busy ? "Saving…" : review ? "Save changes" : "Post review"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
