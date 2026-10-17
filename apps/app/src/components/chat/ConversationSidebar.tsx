"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { ConversationList } from "@/components/chat/ConversationList";
import type { Conversation } from "@/lib/chat";
import { cn } from "@/lib/utils";

/**
 * The conversation rail, folded away on phones. It slides in from the right,
 * the edge its button sits on, over an open thread, so the user can jump
 * between chats without backing out of the one they are in. Picking a
 * chat closes it; so do the scrim, the close button and Escape.
 */
export function ConversationSidebar({
  open,
  onOpenChange,
  conversations,
  activeId,
  statusLabel,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversations: Conversation[] | null;
  activeId: string | null;
  statusLabel: string;
  onSelect: (id: string) => void;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-[70] bg-background/70 backdrop-blur-[2px] lg:hidden",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
          )}
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed inset-y-0 right-0 z-[70] flex w-[min(86vw,22rem)] flex-col border-l border-line bg-surface shadow-2xl shadow-black/70 outline-none lg:hidden",
            "pt-[var(--safe-top)] pb-[var(--safe-bottom)] duration-200",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-right",
            "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right",
          )}
        >
          <header className="flex items-center gap-3 pl-4 pr-2 h-14 shrink-0 border-b border-line">
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="text-[15px] font-bold text-white">
                Messages
              </DialogPrimitive.Title>
              <p className="text-[11px] text-caption truncate">{statusLabel}</p>
            </div>
            <DialogPrimitive.Close
              aria-label="Close conversations"
              className="shrink-0 h-11 w-11 rounded-lg flex items-center justify-center text-caption hover:text-white active:bg-white/[0.05] transition-colors"
            >
              <X className="w-5 h-5" />
            </DialogPrimitive.Close>
          </header>

          <div className="flex-1 overflow-y-auto overscroll-contain">
            <ConversationList
              conversations={conversations}
              activeId={activeId}
              loading={conversations === null}
              onSelect={(id) => {
                onSelect(id);
                onOpenChange(false);
              }}
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
