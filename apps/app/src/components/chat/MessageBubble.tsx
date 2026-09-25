"use client";

import { FileText, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFileSize, formatMessageTime, type ChatMessage } from "@/lib/chat";

/**
 * One message. Images render inline and PDFs render as a download row — both
 * point at a presigned URL the API issued for this viewer, so an attachment is
 * readable only by the two people in the thread.
 *
 * `next/image` is deliberately not used: these URLs are signed, short-lived and
 * unique per read, which defeats the image optimiser's cache and would leak the
 * signed URL into it.
 */
export function MessageBubble({
  message,
  isMine,
  pending,
}: {
  message: ChatMessage;
  isMine: boolean;
  /** An optimistic message that has not been acknowledged yet. */
  pending?: boolean;
}) {
  const attachment = message.attachment;

  return (
    <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[min(78%,32rem)] rounded-2xl px-3.5 py-2.5 space-y-2",
          isMine
            ? "bg-primary/25 border border-primary/40 rounded-br-sm"
            : "bg-surface-2 border border-line rounded-bl-sm",
          pending && "opacity-60",
        )}
      >
        {attachment?.isImage && (
          <a href={attachment.url} target="_blank" rel="noreferrer noopener" className="block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={attachment.url}
              alt={attachment.name}
              className="rounded-lg max-h-72 w-auto object-contain border border-line"
            />
          </a>
        )}

        {attachment && !attachment.isImage && (
          <a
            href={attachment.url}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-2.5 rounded-lg border border-line bg-surface/60 px-3 py-2.5 hover:border-line-strong transition-colors"
          >
            <FileText className="w-5 h-5 shrink-0 text-primary-light" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-medium text-white truncate">
                {attachment.name}
              </span>
              <span className="block text-[11px] text-caption">
                PDF · {formatFileSize(attachment.size)}
              </span>
            </span>
            <Download className="w-4 h-4 shrink-0 text-caption" aria-hidden="true" />
          </a>
        )}

        {message.body && (
          <p className="text-[13px] leading-relaxed text-white whitespace-pre-wrap break-words">
            {message.body}
          </p>
        )}

        <p className={cn("text-[10px] text-caption", isMine ? "text-right" : "text-left")}>
          {pending ? "Sending…" : formatMessageTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
