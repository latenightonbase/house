"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useSession } from "@/components/SessionProvider";
import { fetchUnreadCount } from "@/lib/chat";
import { useChatSocket } from "@/lib/useChatSocket";
import { cn } from "@/lib/utils";

type ChatNotifications = {
  /** Unread incoming messages across every thread; 0 when signed out. */
  unread: number;
  /** Re-reads the count now — the chat page calls this after marking a thread read. */
  refresh: () => void;
};

const ChatNotificationsContext = createContext<ChatNotifications>({
  unread: 0,
  refresh: () => {},
});

const POLL_MS = 60_000;
/** Coalesces a burst of events (a sale's two opening messages) into one read. */
const REFRESH_DEBOUNCE_MS = 250;

function isChatPath(pathname: string) {
  return pathname === "/chat" || pathname.startsWith("/chat/");
}

/**
 * One unread count for the whole app, shared by every nav that shows it.
 *
 * It stays live by listening on the chat socket, so a new message — including
 * the opening messages a sale posts on both sides — lights up the badge without
 * waiting for a poll. The chat page holds its own socket and owns read state
 * there, so this one stands down on `/chat` and the page calls `refresh` instead
 * of two sockets running side by side. Polling and window focus remain as the
 * fallback for a socket that cannot connect.
 *
 * The count always comes from the server rather than being incremented locally,
 * so it can never drift from what the chat page shows.
 */
export function ChatNotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const userId = user?.id ?? null;

  // Only the latest request may write, so a slow response cannot overwrite a newer one.
  const seqRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(() => {
    if (!userId) return;
    const seq = (seqRef.current += 1);
    void fetchUnreadCount().then((count) => {
      if (seq === seqRef.current) setUnread(count);
    });
  }, [userId]);

  const refresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      load();
    }, REFRESH_DEBOUNCE_MS);
  }, [load]);

  useEffect(() => {
    if (!userId) {
      seqRef.current += 1;
      setUnread(0);
      return;
    }

    load();
    const timer = setInterval(load, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [userId, load]);

  // Navigating away from a thread is when its read state has just changed.
  useEffect(() => {
    load();
  }, [pathname, load]);

  useChatSocket(Boolean(userId) && !isChatPath(pathname), {
    onMessage: (_conversationId, message) => {
      if (message.senderId !== userId) refresh();
    },
    // Read on another tab or device.
    onRead: (_conversationId, readerId) => {
      if (readerId === userId) refresh();
    },
    onConversation: refresh,
  });

  const value = useMemo(() => ({ unread, refresh }), [unread, refresh]);

  return (
    <ChatNotificationsContext.Provider value={value}>
      {children}
    </ChatNotificationsContext.Provider>
  );
}

export function useChatNotifications() {
  return useContext(ChatNotificationsContext);
}

/**
 * The floating unread count pinned to a nav icon's corner. It pulses once each
 * time the count goes up, so a message arriving mid-page catches the eye.
 */
export function UnreadBadge({ count, className }: { count: number; className?: string }) {
  const previous = useRef(count);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    if (count > previous.current) setPulse((n) => n + 1);
    previous.current = count;
  }, [count]);

  if (count <= 0) return null;

  return (
    <span
      key={pulse}
      className={cn(
        "unread-badge absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-live text-white text-[10px] font-bold leading-none flex items-center justify-center ring-2 ring-background tabular-nums",
        pulse > 0 && "unread-badge-pop",
        className,
      )}
      aria-label={`${count} unread ${count === 1 ? "message" : "messages"}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
