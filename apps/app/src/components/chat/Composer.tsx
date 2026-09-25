"use client";

import { useRef, useState } from "react";
import { Paperclip, Send, X, FileText } from "lucide-react";
import { Button } from "@/components/ui";
import {
  CHAT_ACCEPT,
  formatFileSize,
  uploadChatAttachment,
  validateChatFile,
  type UploadedAttachment,
} from "@/lib/chat";

/**
 * The message composer. An attachment is uploaded to S3 as soon as it is
 * picked, so pressing send only has to post the resulting key — the slow part
 * happens while the user is still typing, and the send itself stays instant.
 *
 * The 5MB limit is checked here for an immediate error, but this check is a
 * courtesy: the API re-checks the stored object's real size before it will
 * write the message.
 */
export function Composer({
  conversationId,
  disabled,
  onSend,
  onTyping,
}: {
  conversationId: string;
  disabled?: boolean;
  onSend: (input: { body: string | null; attachment: UploadedAttachment | null }) => Promise<void>;
  onTyping?: () => void;
}) {
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<UploadedAttachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const canSend = (text.trim().length > 0 || attachment !== null) && !sending && !uploading;

  async function pickFile(file: File | undefined) {
    if (!file) return;
    setError(null);

    const invalid = validateChatFile(file);
    if (invalid) {
      setError(invalid);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setUploading(true);
    try {
      setAttachment(await uploadChatAttachment(conversationId, file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function submit() {
    if (!canSend) return;
    setSending(true);
    setError(null);

    const payload = { body: text.trim() || null, attachment };
    try {
      await onSend(payload);
      setText("");
      setAttachment(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border-t border-line p-3 space-y-2">
      {attachment && (
        <div className="flex items-center gap-2.5 rounded-lg border border-line bg-surface-2 px-3 py-2">
          <FileText className="w-4 h-4 shrink-0 text-primary-light" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] text-white truncate">{attachment.name}</span>
            <span className="block text-[10px] text-caption">
              {formatFileSize(attachment.size)} · ready to send
            </span>
          </span>
          <button
            type="button"
            onClick={() => setAttachment(null)}
            aria-label="Remove attachment"
            className="shrink-0 text-caption hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && <p className="text-[11px] text-negative">{error}</p>}

      <div className="flex items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          accept={CHAT_ACCEPT}
          className="hidden"
          onChange={(e) => void pickFile(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || uploading}
          aria-label="Attach an image or PDF"
          title="Attach an image or PDF (max 5MB)"
          className="shrink-0 h-10 w-10 rounded-lg border border-line bg-surface-2 flex items-center justify-center text-caption hover:text-white hover:border-line-strong transition-colors disabled:opacity-50"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onTyping?.();
          }}
          onKeyDown={(e) => {
            // Enter sends; Shift+Enter is a newline.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          rows={1}
          disabled={disabled}
          placeholder={uploading ? "Uploading attachment…" : "Write a message…"}
          className="flex-1 max-h-32 resize-none rounded-lg bg-surface-2 border border-line px-3 py-2.5 text-base sm:text-sm text-foreground placeholder:text-caption outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25 disabled:opacity-50"
        />

        <Button
          size="md"
          onClick={() => void submit()}
          disabled={!canSend || disabled}
          aria-label="Send message"
          className="shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
