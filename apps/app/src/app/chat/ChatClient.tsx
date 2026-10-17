"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessagesSquare, Tag } from "lucide-react";
import { Avatar } from "@/components/ui";
import { ConversationList } from "@/components/chat/ConversationList";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { Composer } from "@/components/chat/Composer";
import { ConversationSidebar } from "@/components/chat/ConversationSidebar";
import { useSession } from "@/components/SessionProvider";
import { useChatNotifications } from "@/components/chat/ChatNotifications";
import { useChatSocket } from "@/lib/useChatSocket";
import { useVisualViewport } from "@/lib/useVisualViewport";
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
/** Matches Tailwind's `lg` — where the rail and thread sit side by side. */
const WIDE_QUERY = "(min-width: 1024px)";

function isWide() {
  return typeof window !== "undefined" && window.matchMedia(WIDE_QUERY).matches;
}

/**
 * The chat page: conversation rail on the left, thread on the right.
 *
 * The socket delivers; HTTP is the source of truth. A sent message is written
 * over HTTP and arrives back through the socket like any other, which is what
 * keeps a sender's other tabs in sync. The echo is de-duplicated by id, so the
 * optimistic bubble is replaced rather than doubled.
 *
 * On a narrow screen they become two screens. With no thread picked, the list
 * is an ordinary page. A picked thread becomes a full-screen layer over the
 * app's own header and tab bar, sized to the visible area so the keyboard never
 * covers the composer, and the message list is the only thing that scrolls.
 * Back returns to the list; other chats stay one tap away in a sidebar that
 * slides in over the thread.
 */
export default function ChatClient() {
  const { user } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const requestedId = params.get("c");
  // The nav badge stands its own socket down on this page, so it is told here.
  const { refresh: refreshUnread } = useChatNotifications();

  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(requestedId);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [pending, setPending] = useState<ChatMessage[]>([]);
  const [typingUntil, setTypingUntil] = useState<number>(0);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
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
          void markConversationRead(conversationId).then(refreshUnread, () => {});
        }
      } else if (message.senderId !== user?.id) {
        refreshUnread();
      }

      bumpConversation(conversationId, message, isActive);
    },
    [bumpConversation, user?.id, refreshUnread],
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

  // The URL can change under a mounted page — tapping the Chat tab from inside a
  // thread lands on bare /chat, which on a phone means "back to the list".
  useEffect(() => {
    if (requestedId || !isWide()) setActiveId(requestedId);
  }, [requestedId]);

  useEffect(() => {
    fetchConversations()
      .then((list) => {
        setConversations(list);
        // Nothing requested and nothing chosen — open the newest thread so the
        // page is never an empty shell on a wide screen. A phone starts on the list.
        if (isWide()) setActiveId((current) => current ?? list[0]?.id ?? null);
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
        void markConversationRead(activeId).then(refreshUnread, () => {});
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
  }, [activeId, refreshUnread]);

  const viewport = useVisualViewport(Boolean(activeId));

  // Scrolls the thread itself, never the page, so a wide screen does not jump.
  useEffect(() => {
    const scroller = scrollerRef.current;
    scroller?.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  // The keyboard opening shrinks the thread; keep the newest message in sight.
  useEffect(() => {
    const scroller = scrollerRef.current;
    scroller?.scrollTo({ top: scroller.scrollHeight });
  }, [viewport.height]);

  // An open thread on a phone is a fixed layer; the page behind it must not
  // scroll, or a drag that starts on the header moves the document instead.
  useEffect(() => {
    if (!activeId) return;
    const root = document.documentElement;
    root.classList.add("chat-thread-open");
    return () => root.classList.remove("chat-thread-open");
  }, [activeId]);

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
  const statusLabel =
    status === "open"
      ? "Connected"
      : status === "connecting"
        ? "Connecting…"
        : "Offline — reconnecting. Messages you send still go through.";
  const unreadElsewhere =
    conversations?.reduce((sum, c) => (c.id === activeId ? sum : sum + c.unreadCount), 0) ?? 0;

  // Placement for the phone thread layer: exactly the visible area. The home
  // indicator inset only applies while the keyboard is down. Ignored on a wide screen.
  const layerStyle = {
    "--chat-top": `${viewport.offsetTop}px`,
    "--chat-height": viewport.height ? `${viewport.height}px` : "100dvh",
    "--chat-bottom-inset": viewport.keyboardOpen ? "0px" : "var(--safe-bottom)",
  } as CSSProperties;

  function backToList() {
    setActiveId(null);
    router.replace("/chat", { scroll: false });
  }

  return (
    <div className="w-full">
      <header className={cn("mb-4", activeId && "max-lg:hidden")}>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Messages</h1>
        <p className="mt-1 text-[13px] text-caption">{statusLabel}</p>
      </header>

      <div className={cn("card overflow-hidden lg:grid lg:grid-cols-[320px_1fr] lg:h-[calc(100dvh-13rem)] lg:min-h-[28rem]", activeId && "max-lg:border-0")}>
        {/* Rail — the whole page on a phone until a thread is chosen. */}
        <aside className={cn("lg:border-r border-line lg:overflow-y-auto", activeId && "max-lg:hidden")}>
          <ConversationList
            conversations={conversations}
            activeId={activeId}
            loading={conversations === null}
            onSelect={select}
          />
        </aside>

        <section
          style={layerStyle}
          className={cn(
            "flex-col min-w-0",
            activeId
              ? "flex max-lg:fixed max-lg:inset-x-0 max-lg:z-[60] max-lg:bg-surface max-lg:top-[var(--chat-top)] max-lg:h-[var(--chat-height)]"
              : "hidden lg:flex",
          )}
        >
          {activeConversation ? (
            <>
              <header className="shrink-0 flex items-center gap-2 lg:gap-3 px-1.5 lg:px-4 py-2 lg:py-3 border-b border-line max-lg:pt-[calc(0.5rem+var(--safe-top))] max-lg:bg-background/95 max-lg:backdrop-blur-md">
                <button
                  type="button"
                  onClick={backToList}
                  aria-label="Back to conversations"
                  className="lg:hidden shrink-0 h-11 w-11 rounded-lg flex items-center justify-center text-caption hover:text-white active:bg-white/[0.05] transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <span className="relative shrink-0">
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
                  {activeConversation.counterparty.online && (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-positive border-2 border-surface"
                      aria-hidden="true"
                    />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] lg:text-[13px] font-semibold text-white truncate">
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
                  <p className={cn("text-[11px] truncate", typing ? "text-primary-light" : "text-caption")}>
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
                    aria-label={`View listing: ${activeConversation.listing.title}`}
                    className="shrink-0 max-lg:h-11 max-lg:w-11 max-lg:rounded-lg flex items-center justify-center text-[11px] text-caption hover:text-white max-lg:active:bg-white/[0.05] transition-colors"
                  >
                    <Tag className="w-[18px] h-[18px] lg:hidden" aria-hidden="true" />
                    <span className="max-lg:hidden">View listing →</span>
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  aria-label={
                    unreadElsewhere > 0
                      ? `Switch conversation, ${unreadElsewhere} unread`
                      : "Switch conversation"
                  }
                  aria-haspopup="dialog"
                  aria-expanded={sidebarOpen}
                  className="lg:hidden relative shrink-0 h-11 w-11 rounded-lg flex items-center justify-center text-caption hover:text-white active:bg-white/[0.05] transition-colors"
                >
                  <MessagesSquare className="w-5 h-5" />
                  {unreadElsewhere > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute top-1.5 right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-background"
                    >
                      {unreadElsewhere > 99 ? "99+" : unreadElsewhere}
                    </span>
                  )}
                </button>
              </header>

              {status === "offline" && (
                <p className="lg:hidden shrink-0 px-4 py-1.5 text-[11px] text-warning bg-warning/10 border-b border-line">
                  Offline — reconnecting. Messages you send still go through.
                </p>
              )}

              <div
                ref={scrollerRef}
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 lg:px-4 py-4 space-y-2.5"
              >
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
              </div>

              <Composer
                conversationId={activeConversation.id}
                onSend={send}
                onTyping={() => sendTyping(activeConversation.id)}
                className="max-lg:pb-[calc(0.625rem+var(--chat-bottom-inset))]"
              />
            </>
          ) : activeId && conversations !== null ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
              <p className="text-[13px] text-caption text-center max-w-xs">
                This conversation could not be found.
              </p>
              <button
                type="button"
                onClick={backToList}
                className="text-[13px] font-semibold text-primary-light hover:text-white transition-colors"
              >
                Back to messages
              </button>
            </div>
          ) : activeId ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <p className="text-[13px] text-caption">Loading conversation…</p>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <p className="text-[13px] text-caption text-center max-w-xs">
                Pick a conversation, or start one from a winner or creator on your profile.
              </p>
            </div>
          )}
        </section>
      </div>

      <ConversationSidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        conversations={conversations}
        activeId={activeId}
        statusLabel={statusLabel}
        onSelect={select}
      />
    </div>
  );
}
