"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getChatSocketUrl } from "@/lib/api-origin";
import { requestChatTicket, type ChatMessage, type Conversation } from "@/lib/chat";

/**
 * The live chat socket.
 *
 * Connecting is two steps: ask the API for a single-use ticket over the
 * authenticated HTTP path, then dial the API origin directly with it. The
 * socket cannot go through the app's `/backend` proxy, and the session cookie
 * is host-only on the app domain, so the ticket is what carries identity
 * across. Tickets expire in a minute and are consumed on use, so every
 * reconnect fetches a fresh one.
 *
 * The server sends `ready` once it has authenticated the connection; nothing is
 * sent before that. A closed socket retries with backoff, and the caller is
 * told the status so the UI can say when it is offline.
 */

export type ChatSocketStatus = "connecting" | "open" | "offline";

type Handlers = {
  onMessage?: (conversationId: string, message: ChatMessage) => void;
  onRead?: (conversationId: string, userId: string, lastReadAt: string) => void;
  onTyping?: (conversationId: string, userId: string) => void;
  onConversation?: (conversation: Conversation) => void;
};

const MAX_BACKOFF_MS = 15_000;

export function useChatSocket(enabled: boolean, handlers: Handlers) {
  const [status, setStatus] = useState<ChatSocketStatus>("connecting");
  const socketRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closedRef = useRef(false);

  // Handlers change every render in practice; keeping them in a ref means the
  // socket is not torn down and rebuilt each time the parent re-renders.
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const connect = useCallback(async () => {
    if (closedRef.current) return;
    setStatus((current) => (current === "open" ? current : "connecting"));

    let ticket: string;
    try {
      ticket = await requestChatTicket();
    } catch {
      scheduleRetry();
      return;
    }
    if (closedRef.current) return;

    let socket: WebSocket;
    try {
      socket = new WebSocket(getChatSocketUrl(ticket));
    } catch {
      scheduleRetry();
      return;
    }
    socketRef.current = socket;

    socket.addEventListener("message", (event) => {
      let payload: {
        type?: string;
        conversationId?: string;
        message?: ChatMessage;
        conversation?: Conversation;
        userId?: string;
        lastReadAt?: string;
      };
      try {
        payload = JSON.parse(String(event.data));
      } catch {
        return;
      }

      switch (payload.type) {
        case "ready":
          attemptRef.current = 0;
          setStatus("open");
          break;
        case "message":
          if (payload.conversationId && payload.message) {
            handlersRef.current.onMessage?.(payload.conversationId, payload.message);
          }
          break;
        case "read":
          if (payload.conversationId && payload.userId && payload.lastReadAt) {
            handlersRef.current.onRead?.(
              payload.conversationId,
              payload.userId,
              payload.lastReadAt,
            );
          }
          break;
        case "typing":
          if (payload.conversationId && payload.userId) {
            handlersRef.current.onTyping?.(payload.conversationId, payload.userId);
          }
          break;
        case "conversation":
          if (payload.conversation) handlersRef.current.onConversation?.(payload.conversation);
          break;
        default:
          break;
      }
    });

    socket.addEventListener("close", () => {
      socketRef.current = null;
      if (closedRef.current) return;
      setStatus("offline");
      scheduleRetry();
    });

    socket.addEventListener("error", () => {
      // `close` always follows, which is where the retry is scheduled.
      try {
        socket.close();
      } catch {
        /* already closing */
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scheduleRetry = useCallback(() => {
    if (closedRef.current || retryRef.current) return;
    const attempt = (attemptRef.current += 1);
    const delay = Math.min(1000 * 2 ** (attempt - 1), MAX_BACKOFF_MS);
    retryRef.current = setTimeout(() => {
      retryRef.current = null;
      void connect();
    }, delay);
  }, [connect]);

  useEffect(() => {
    if (!enabled) return;
    closedRef.current = false;
    void connect();

    return () => {
      closedRef.current = true;
      if (retryRef.current) {
        clearTimeout(retryRef.current);
        retryRef.current = null;
      }
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [enabled, connect]);

  /** Fire-and-forget signal; returns false when the socket is not up. */
  const send = useCallback((payload: Record<string, unknown>) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(payload));
    return true;
  }, []);

  const sendTyping = useCallback(
    (conversationId: string) => send({ type: "typing", conversationId }),
    [send],
  );

  const sendRead = useCallback(
    (conversationId: string) => send({ type: "read", conversationId }),
    [send],
  );

  return { status, send, sendTyping, sendRead };
}
