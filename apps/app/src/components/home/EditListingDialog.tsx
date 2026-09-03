"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Loader2, X } from "lucide-react";
import {
  fetchMyProject,
  saveMyProject,
  type AuctionState,
  type DailyProject,
} from "@/lib/dailyAuction";
import type { Listing } from "@/lib/marketplace";
import { ProjectPitchFields } from "./ProjectPitchFields";

const EMPTY: DailyProject = {
  name: "",
  description: "",
  imageUrl: "",
  websiteUrl: "",
  twitterUrl: "",
  youtubeUrl: "",
};

/**
 * Lets the current daily-auction leader change their pitch without placing a
 * new bid. The server rejects the save once the clock has run out.
 */
export function EditListingDialog({
  listing,
  open,
  onClose,
  onSaved,
}: {
  listing: Listing;
  open: boolean;
  onClose: () => void;
  onSaved: (auction: AuctionState | null) => void;
}) {
  const [project, setProject] = useState<DailyProject>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      setLoading(true);
      setSaving(false);
      setDone(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetchMyProject(listing.id)
      .then((saved) => {
        if (cancelled) return;
        if (saved) {
          setProject({
            name: saved.name,
            description: saved.description ?? "",
            imageUrl: saved.imageUrl ?? "",
            websiteUrl: saved.websiteUrl ?? "",
            twitterUrl: saved.twitterUrl ?? "",
            youtubeUrl: saved.youtubeUrl ?? "",
          });
        } else {
          setProject(EMPTY);
        }
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [open, listing.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !saving && onClose();
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose, saving]);

  const nameMissing = !project.name.trim();

  async function handleSave() {
    if (saving || loading || done) return;
    setError(null);

    if (nameMissing) {
      setError("Your project needs a name.");
      return;
    }

    const pitch: DailyProject = {
      name: project.name.trim(),
      description: project.description?.trim() || null,
      imageUrl: project.imageUrl?.trim() || null,
      websiteUrl: project.websiteUrl?.trim() || null,
      twitterUrl: project.twitterUrl?.trim() || null,
      youtubeUrl: project.youtubeUrl?.trim() || null,
    };

    setSaving(true);
    try {
      const result = await saveMyProject(listing.id, pitch);
      setDone(true);
      setSaving(false);
      onSaved(result.auction ?? null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save details";
      setError(message);
      setSaving(false);
      if (/closed/i.test(message)) {
        onSaved(null);
      }
    }
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-background/85 backdrop-blur-sm p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Edit listing"
      onClick={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <div className="card w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto rounded-b-none sm:rounded-2xl">
        <header className="sticky top-0 z-10 flex items-start gap-3 px-5 sm:px-6 py-4 bg-surface border-b border-line">
          <div className="min-w-0">
            <p className="eyebrow text-primary-bright">Edit listing</p>
            <h2 className="mt-1 text-[17px] font-bold text-white">
              Tomorrow&apos;s Attention Auction
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="ml-auto shrink-0 flex items-center justify-center w-8 h-8 rounded-lg border border-line text-caption hover:text-white disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {done ? (
          <div className="px-5 sm:px-6 py-10 text-center">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-positive/15 border border-positive/30">
              <Check className="w-6 h-6 text-positive" aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-[18px] font-bold text-white">Listing updated</h3>
            <p className="mt-2 text-[13px] text-caption leading-relaxed max-w-sm mx-auto">
              Your project details are live on the auction. You can change them again until the
              clock runs out.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="gradient-button mt-6 h-11 px-6 rounded-lg text-white eyebrow"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="px-5 sm:px-6 py-5 space-y-5">
            {loading ? (
              <div className="tile h-40 animate-pulse" />
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="eyebrow text-primary-light">Your project</p>
                  <p className="mt-1.5 text-[12px] text-caption leading-relaxed">
                    This is what everyone sees while you hold the lead, and what goes on the
                    billboard if you win.
                  </p>
                </div>
                <ProjectPitchFields
                  project={project}
                  onChange={(patch) => setProject((p) => ({ ...p, ...patch }))}
                  disabled={saving}
                  idPrefix="edit-project"
                />
              </div>
            )}

            {error && (
              <p className="text-[12px] text-negative leading-relaxed" role="alert">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || loading}
              aria-busy={saving || loading}
              className="gradient-button w-full inline-flex items-center justify-center gap-2.5 h-12 rounded-lg text-white text-[13px] uppercase tracking-[0.14em] font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving || loading ? (
                <Loader2 className="w-[17px] h-[17px] animate-spin" />
              ) : (
                "Save changes"
              )}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
