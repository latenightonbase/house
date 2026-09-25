/**
 * Chat data layer. Everything here goes over HTTP through the `/backend`
 * proxy; the WebSocket (see `useChatSocket`) only carries live delivery and
 * lightweight signals. Sending is available on both paths and funnels through
 * the same server code, so a dropped socket degrades to a working REST send
 * rather than a broken thread.
 */

export type MessageKind = "TEXT" | "IMAGE" | "FILE";

export type ChatAttachment = {
  name: string;
  mime: string;
  size: number;
  /** Short-lived presigned GET; re-issued on every read, never stored. */
  url: string;
  isImage: boolean;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  kind: MessageKind;
  body: string | null;
  attachment: ChatAttachment | null;
  createdAt: string;
};

export type ChatCounterparty = {
  userId: string | null;
  wallet: string | null;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  online: boolean;
};

export type Conversation = {
  id: string;
  counterparty: ChatCounterparty;
  listing: { id: string; title: string } | null;
  lastMessageAt: string | null;
  lastMessage: { preview: string; kind: MessageKind; senderId: string } | null;
  unreadCount: number;
  createdAt: string;
};

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    cache: "no-store",
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export async function fetchConversations(): Promise<Conversation[]> {
  const data = await getJson<{ conversations: Conversation[] }>("/backend/chat/conversations");
  return data.conversations;
}

export async function fetchMessages(
  conversationId: string,
  before?: string,
): Promise<{ messages: ChatMessage[]; hasMore: boolean; conversation: Conversation }> {
  const query = before ? `?before=${encodeURIComponent(before)}` : "";
  return getJson(`/backend/chat/conversations/${conversationId}/messages${query}`);
}

/**
 * Opens the thread with someone, or returns the existing one. Idempotent, so
 * every "Contact" button in the app can call it without checking first.
 */
export async function startConversation(
  userId: string,
  listingId?: string | null,
): Promise<Conversation> {
  const data = await getJson<{ conversation: Conversation }>("/backend/chat/conversations", {
    method: "POST",
    body: JSON.stringify({ userId, listingId: listingId ?? null }),
  });
  return data.conversation;
}

export async function sendChatMessage(
  conversationId: string,
  input: { body?: string | null; attachment?: UploadedAttachment | null },
): Promise<ChatMessage> {
  const data = await getJson<{ message: ChatMessage }>(
    `/backend/chat/conversations/${conversationId}/messages`,
    { method: "POST", body: JSON.stringify(input) },
  );
  return data.message;
}

export async function markConversationRead(conversationId: string): Promise<void> {
  await getJson(`/backend/chat/conversations/${conversationId}/read`, { method: "POST" });
}

export async function fetchUnreadCount(): Promise<number> {
  try {
    const data = await getJson<{ unread: number }>("/backend/chat/unread-count");
    return data.unread ?? 0;
  } catch {
    return 0;
  }
}

export async function requestChatTicket(): Promise<string> {
  const data = await getJson<{ ticket: string }>("/backend/chat/ws-ticket", { method: "POST" });
  return data.ticket;
}

export type UploadedAttachment = {
  key: string;
  name: string;
  mime: string;
  size: number;
};

export const CHAT_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
] as const;

export const CHAT_ACCEPT = [...CHAT_IMAGE_TYPES, "application/pdf"].join(",");

export const MAX_CHAT_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export function validateChatFile(file: File): string | null {
  const allowed: readonly string[] = [...CHAT_IMAGE_TYPES, "application/pdf"];
  if (!allowed.includes(file.type)) {
    return "Attachments must be an image (JPEG, PNG, WebP, AVIF, GIF) or a PDF.";
  }
  if (file.size > MAX_CHAT_ATTACHMENT_BYTES) {
    return "Attachments must be 5MB or smaller.";
  }
  if (file.size === 0) return "That file is empty.";
  return null;
}

/**
 * Presigns against the conversation, then PUTs straight to S3. The object is
 * private — the message only carries its key, and the API hands back a
 * short-lived read URL to participants when the thread is loaded.
 */
export async function uploadChatAttachment(
  conversationId: string,
  file: File,
): Promise<UploadedAttachment> {
  const invalid = validateChatFile(file);
  if (invalid) throw new Error(invalid);

  const presigned = await getJson<{ uploadUrl: string; key: string; fileName: string }>(
    `/backend/chat/conversations/${conversationId}/attachments/presign`,
    {
      method: "POST",
      body: JSON.stringify({
        contentType: file.type,
        fileName: file.name,
        size: file.size,
      }),
    },
  );

  const put = await fetch(presigned.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!put.ok) {
    throw new Error("Upload failed. Confirm the S3 bucket allows CORS from this origin.");
  }

  return {
    key: presigned.key,
    name: presigned.fileName,
    mime: file.type,
    size: file.size,
  };
}

export function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/** Clock time for a message, or the date once it is not from today. */
export function formatMessageTime(iso: string) {
  const date = new Date(iso);
  const sameDay = new Date().toDateString() === date.toDateString();
  return sameDay
    ? date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
