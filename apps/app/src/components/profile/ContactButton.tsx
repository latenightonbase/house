"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui";
import { startConversation } from "@/lib/chat";

/**
 * Opens the DM thread with one person and lands the user in it. Starting a
 * conversation is idempotent server-side, so this never needs to check whether
 * a thread already exists — pressing it twice reopens the same one.
 *
 * Rendered only where a `userId` is present. The public profile endpoint strips
 * that field, which is what keeps this button off other people's profiles
 * rather than a check duplicated in every caller.
 */
export function ContactButton({
  userId,
  listingId,
  label = "Message",
  className,
  size = "sm",
}: {
  userId: string;
  listingId?: string | null;
  label?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setBusy(true);
    setError(null);
    try {
      const conversation = await startConversation(userId, listingId);
      router.push(`/chat?c=${conversation.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open chat");
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <Button variant="accent-outline" size={size} onClick={open} disabled={busy}>
        <MessageSquare className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
        {busy ? "Opening…" : label}
      </Button>
      {error && <p className="mt-1 text-[11px] text-negative">{error}</p>}
    </div>
  );
}
