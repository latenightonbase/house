"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Avatar } from "@/components/ui";
import { ConversationList } from "@/components/chat/ConversationList";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { Composer } from "@/components/chat/Composer";
import { useSession } from "@/components/SessionProvider";
import { useChatSocket } from "@/lib/useChatSocket";
import { cn } from "@/lib/utils";
import {
  fetchConversations,
  fetchMessages,
  markConversationRead,
  sendChatMessage,
  type ChatMessage,
  type Conversation,
  type UploadedAttachment,
} from "@/lib/chat";

const TYPING_TIMEOUT_MS = 4000;

/**
 * The chat page: conversation rail on the left, thread on the right.
 *
 * The socket delivers; HTTP is the source of truth. A sent message is written
 * over HTTP and arrives back through the socket like any other, which is what
 * keeps a sender's other tabs in sync. The echo is de-duplicated by id, so the
 * optimistic bubble is replaced rather than doubled.
 *
 * On a narrow screen the two panes become one: the rail is the page until a
 * thread is picked, and a back control returns to it.
 */
export default function ChatClient() {
  const { user } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const requestedId = params.get("c");

  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(requestedId);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [pending, setPending] = useState<ChatMessage[]>([]);
  const [typingUntil, setTypingUntil] = useState<number>(0);
  const [threadError, setThreadError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef<string | null>(activeId);
  activeIdRef.current = activeId;

  const activeConversation = useMemo(
    () => conversations?.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  /** Moves a thread to the top of the rail and refreshes its preview. */
  const bumpConversation = useCallback(
    (conversationId: string, message: ChatMessage, isActive: boolean) => {
      setConversations((current) => {
        if (!current) return current;
        const index = current.findIndex((c) => c.id === conversationId);
        if (index === -1) return current;

        const existing = current[index];
        const updated: Conversation = {
          ...existing,
          lastMessageAt: message.createdAt,
          lastMessage: {
            preview: message.body?.slice(0, 140) || (message.kind === "IMAGE" ? "Photo" : "File"),
            kind: message.kind,
            senderId: message.senderId,
          },
          unreadCount:
            isActive || message.senderId === user?.id ? 0 : existing.unreadCount + 1,
        };
        return [updated, ...current.filter((_, i) => i !== index)];
      });
    },
    [user?.id],
  );

  const handleIncoming = useCallback(
    (conversationId: string, message: ChatMessage) => {
      const isActive = activeIdRef.current === conversationId;

      if (isActive) {
        setMessages((current) => {
          if (!current) return current;
          if (current.some((m) => m.id === message.id)) return current;
          return [...current, message];
        });
        // Our own echo clears the optimistic copy it corresponds to.
        if (message.senderId === user?.id) {
          setPending((current) => current.filter((m) => m.body !== message.body));
        } else {
          void markConversationRead(conversationId).catch(() => {});
        }
      }

      bumpConversation(conversationId, message, isActive);
    },
    [bumpConversation, user?.id],
  );

  const handleNewConversation = useCallback((conversation: Conversation) => {
    setConversations((current) => {
      if (!current) return [conversation];
      if (current.some((c) => c.id === conversation.id)) return current;
      return [conversation, ...current];
    });
  }, []);

  const handleTyping = useCallback((conversationId: string) => {
    if (activeIdRef.current !== conversationId) return;
    setTypingUntil(Date.now() + TYPING_TIMEOUT_MS);
  }, []);

  const { status, sendTyping } = useChatSocket(Boolean(user), {
    onMessage: handleIncoming,
    onConversation: handleNewConversation,
    onTyping: handleTyping,
  });

  useEffect(() => {
    fetchConversations()
      .then((list) => {
        setConversations(list);
        // Nothing requested and nothing chosen — open the newest thread so the
        // page is never an empty shell on a wide screen.
        setActiveId((current) => current ?? list[0]?.id ?? null);
      })
      .catch(() => setConversations([]));
  }, []);

  useEffect(() => {
    if (!activeId) {
      setMessages(null);
      return;
    }

    let active = true;
    setMessages(null);
    setThreadError(null);
    setTypingUntil(0);

    fetchMessages(activeId)
      .then((data) => {
        if (!active) return;
        setMessages(data.messages);
        void markConversationRead(activeId).catch(() => {});
        setConversations((current) =>
          current?.map((c) => (c.id === activeId ? { ...c, unreadCount: 0 } : c)) ?? current,
        );
      })
      .catch((err) => {
        if (!active) return;
        setThreadError(err instanceof Error ? err.message : "Could not load this conversation");
      });

    return () => {
      active = false;
    };
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  // Clears the "typing…" line once the signal goes stale.
  useEffect(() => {
    if (typingUntil <= Date.now()) return;
    const timer = setTimeout(() => setTypingUntil(0), typingUntil - Date.now());
    return () => clearTimeout(timer);
  }, [typingUntil]);

  function select(id: string) {
    setActiveId(id);
    router.replace(`/chat?c=${id}`, { scroll: false });
  }

  async function send(input: { body: string | null; attachment: UploadedAttachment | null }) {
    if (!activeId || !user) return;

    const optimistic: ChatMessage = {
      id: `pending-${crypto.randomUUID()}`,
      conversationId: activeId,
      senderId: user.id,
      kind: input.attachment ? (input.attachment.mime.startsWith("image/") ? "IMAGE" : "FILE") : "TEXT",
      body: input.body,
      attachment: null,
      createdAt: new Date().toISOString(),
    };
    setPending((current) => [...current, optimistic]);

    try {
      const saved = await sendChatMessage(activeId, input);
      setPending((current) => current.filter((m) => m.id !== optimistic.id));
      setMessages((current) => {
        if (!current) return [saved];
        if (current.some((m) => m.id === saved.id)) return current;
        return [...current, saved];
      });
      bumpConversation(activeId, saved, true);
    } catch (err) {
      setPending((current) => current.filter((m) => m.id !== optimistic.id));
      throw err;
    }
  }

  const typing = typingUntil > Date.now();

  return (
    <div className="w-full">
      <header className="mb-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Messages</h1>
        <p className="mt-1 text-[13px] text-caption">
          {status === "open"
            ? "Connected"
            : status === "connecting"
              ? "Connecting…"
              : "Offline — reconnecting. Messages you send still go through."}
        </p>
      </header>

      <div className="card overflow-hidden grid lg:grid-cols-[320px_1fr] h-[calc(100dvh-13rem)] min-h-[28rem]">
        {/* Rail — full width until a thread is chosen on small screens. */}
        <aside
          className={cn(
            "lg:border-r border-line overflow-y-auto",
            activeId ? "hidden lg:block" : "block",
          )}
        >
          <ConversationList
            conversations={conversations}
            activeId={activeId}
            loading={conversations === null}
            onSelect={select}
          />
        </aside>

        <section className={cn("flex flex-col min-w-0", activeId ? "flex" : "hidden lg:flex")}>
          {activeConversation ? (
            <>
              <header className="flex items-center gap-3 px-4 py-3 border-b border-line">
                <button
                  type="button"
                  onClick={() => {
                    setActiveId(null);
                    router.replace("/chat", { scroll: false });
                  }}
                  aria-label="Back to conversations"
                  className="lg:hidden shrink-0 text-caption hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <Avatar
                  src={activeConversation.counterparty.avatarUrl}
                  fallbackSeed={
                    activeConversation.counterparty.wallet ??
                    activeConversation.counterparty.userId ??
                    activeConversation.counterparty.name
                  }
                  fallback={activeConversation.counterparty.name.slice(0, 2).toUpperCase()}
                  size={34}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-white truncate">
                    {activeConversation.counterparty.username ? (
                      <Link
                        href={`/user/${activeConversation.counterparty.username}`}
                        className="hover:text-primary-bright transition-colors"
                      >
                        {activeConversation.counterparty.name}
                      </Link>
                    ) : (
                      activeConversation.counterparty.name
                    )}
                  </p>
                  <p className="text-[11px] text-caption truncate">
                    {typing
                      ? "typing…"
                      : activeConversation.counterparty.online
                        ? "Online"
                        : activeConversation.listing
                          ? `re: ${activeConversation.listing.title}`
                          : "Offline"}
                  </p>
                </div>
                {activeConversation.listing && (
                  <Link
                    href={`/listings/${activeConversation.listing.id}`}
                    className="shrink-0 text-[11px] text-caption hover:text-white transition-colors"
                  >
                    View listing →
                  </Link>
                )}
              </header>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
                {threadError && <p className="text-[12px] text-negative">{threadError}</p>}
                {messages === null && !threadError && (
                  <p className="text-[12px] text-caption">Loading messages…</p>
                )}
                {messages?.length === 0 && (
                  <p className="text-[12px] text-caption text-center py-8">
                    No messages yet. Say hello.
                  </p>
                )}
                {messages?.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isMine={message.senderId === user?.id}
                  />
                ))}
                {pending.map((message) => (
                  <MessageBubble key={message.id} message={message} isMine pending />
                ))}
                <div ref={bottomRef} />
              </div>

              <Composer
                conversationId={activeConversation.id}
                onSend={send}
                onTyping={() => sendTyping(activeConversation.id)}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <p className="text-[13px] text-caption text-center max-w-xs">
                Pick a conversation, or start one from a winner or creator on your profile.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
