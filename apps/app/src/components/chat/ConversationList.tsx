"use client";

import { Avatar } from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatMessageTime, type Conversation } from "@/lib/chat";

/** Left rail: every thread, newest first, with unread counts and presence. */
export function ConversationList({
  conversations,
  activeId,
  loading,
  onSelect,
}: {
  conversations: Conversation[] | null;
  activeId: string | null;
  loading?: boolean;
  onSelect: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-2 p-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 rounded-xl animate-pulse bg-white/[0.03]" />
        ))}
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-[12px] text-caption leading-relaxed">
          No conversations yet. Start one from a winner or a creator on your profile.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-line">
      {conversations.map((conversation) => {
        const active = conversation.id === activeId;
        const { counterparty } = conversation;

        return (
          <li key={conversation.id}>
            <button
              type="button"
              onClick={() => onSelect(conversation.id)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "w-full text-left px-3.5 py-3 flex items-center gap-3 transition-colors",
                active ? "bg-primary/15" : "hover:bg-white/[0.03]",
              )}
            >
              <span className="relative shrink-0">
                <Avatar
                  src={counterparty.avatarUrl}
                  fallback={counterparty.name.slice(0, 2).toUpperCase()}
                  size={38}
                />
                {counterparty.online && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-positive border-2 border-surface"
                    aria-label="Online"
                  />
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="text-[13px] font-semibold text-white truncate">
                    {counterparty.name}
                  </span>
                  {conversation.lastMessageAt && (
                    <span className="ml-auto shrink-0 text-[10px] text-caption">
                      {formatMessageTime(conversation.lastMessageAt)}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 flex items-center gap-2">
                  <span className="text-[11px] text-caption truncate">
                    {conversation.lastMessage?.preview || "No messages yet"}
                  </span>
                  {conversation.unreadCount > 0 && (
                    <span className="ml-auto shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                      {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                    </span>
                  )}
                </span>
                {conversation.listing && (
                  <span className="mt-0.5 block text-[10px] text-caption truncate">
                    re: {conversation.listing.title}
                  </span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
