import { Elysia, t } from "elysia";
import { prisma } from "../db";
import { getUserFromRequest } from "../lib/session";
import {
  conversationForViewer,
  ensureConversation,
  listConversations,
  participantIds,
  serializeConversation,
  serializeMessage,
  type SerializedMessage,
} from "../lib/chat/conversations";
import { addSocket, publish, removeSocket } from "../lib/chat/hub";
import { issueChatTicket, redeemChatTicket } from "../lib/chat/tickets";
import {
  MAX_CHAT_ATTACHMENT_BYTES,
  validateChatAttachmentSize,
  validateChatAttachmentType,
  isChatImage,
  sanitizeFileName,
} from "../lib/s3/fileValidation";
import { generateChatAttachmentUpload, headUploadedObject } from "../lib/s3/presign";

const MESSAGE_PAGE_SIZE = 50;
const MAX_BODY_LENGTH = 4000;

const attachmentBody = t.Object({
  key: t.String({ maxLength: 600 }),
  name: t.Optional(t.Union([t.String({ maxLength: 200 }), t.Null()])),
  mime: t.String({ maxLength: 120 }),
  size: t.Number(),
});

type AttachmentInput = {
  key: string;
  name?: string | null;
  mime: string;
  size: number;
};

type SendResult =
  | { ok: true; message: SerializedMessage }
  | { ok: false; status: number; error: string };

/**
 * Writes a message and fans it out. Both the REST route and the WebSocket
 * handler funnel through here so the two paths cannot diverge — the socket is
 * the delivery mechanism, never a second set of rules.
 *
 * The attachment is verified against S3 before the row is written: a presigned
 * PUT cannot cap the body size, so the declared size is untrusted and the
 * object's real `ContentLength` is what the 5MB limit is enforced on. The key
 * must also sit under this conversation's prefix, which stops a participant
 * attaching an object from a thread they are not in.
 */
async function sendMessage(opts: {
  conversationId: string;
  senderId: string;
  body?: string | null;
  attachment?: AttachmentInput | null;
}): Promise<SendResult> {
  const conversation = await conversationForViewer(opts.conversationId, opts.senderId);
  if (!conversation) return { ok: false, status: 404, error: "Conversation not found" };

  const text = opts.body?.trim() ? opts.body.trim().slice(0, MAX_BODY_LENGTH) : null;
  const attachment = opts.attachment ?? null;

  if (!text && !attachment) {
    return { ok: false, status: 400, error: "Message is empty" };
  }

  let kind: "TEXT" | "IMAGE" | "FILE" = "TEXT";
  let stored: { key: string; name: string; mime: string; size: number } | null = null;

  if (attachment) {
    const typeCheck = validateChatAttachmentType(attachment.mime);
    if (!typeCheck.valid) return { ok: false, status: 400, error: typeCheck.error };

    if (!attachment.key.startsWith(`chat/${opts.conversationId}/`)) {
      return { ok: false, status: 403, error: "Attachment does not belong to this conversation" };
    }

    const head = await headUploadedObject(attachment.key);
    if (!head) return { ok: false, status: 400, error: "Attachment upload was not found" };

    const sizeCheck = validateChatAttachmentSize(head.size);
    if (!sizeCheck.valid) return { ok: false, status: 400, error: sizeCheck.error };

    // Trust what S3 actually stored over what the client claimed.
    const mime = head.contentType ?? attachment.mime;
    const mimeCheck = validateChatAttachmentType(mime);
    if (!mimeCheck.valid) return { ok: false, status: 400, error: mimeCheck.error };

    kind = isChatImage(mime) ? "IMAGE" : "FILE";
    stored = {
      key: attachment.key,
      name: sanitizeFileName(attachment.name, mime),
      mime,
      size: head.size,
    };
  }

  const now = new Date();
  const [created] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId: opts.conversationId,
        senderId: opts.senderId,
        kind,
        body: text,
        attachmentKey: stored?.key ?? null,
        attachmentName: stored?.name ?? null,
        attachmentMime: stored?.mime ?? null,
        attachmentSize: stored?.size ?? null,
      },
    }),
    prisma.conversation.update({
      where: { id: opts.conversationId },
      data: { lastMessageAt: now },
    }),
    // Sending is itself a read for the sender, so their own message never
    // comes back as unread on another device.
    prisma.conversationParticipant.updateMany({
      where: { conversationId: opts.conversationId, userId: opts.senderId },
      data: { lastReadAt: now },
    }),
  ]);

  const message = await serializeMessage(created);
  const recipients = conversation.participants.map((p) => p.userId);
  publish(recipients, { type: "message", conversationId: opts.conversationId, message });

  return { ok: true, message };
}

/** Marks everything up to now as read for one participant. */
async function markRead(conversationId: string, userId: string) {
  const now = new Date();
  await prisma.conversationParticipant.updateMany({
    where: { conversationId, userId },
    data: { lastReadAt: now },
  });
  const recipients = await participantIds(conversationId);
  publish(recipients, {
    type: "read",
    conversationId,
    userId,
    lastReadAt: now.toISOString(),
  });
  return now;
}

/**
 * Tracks each live socket. Elysia builds a new wrapper object for every event,
 * so this is keyed by the connection's stable id, and it holds the exact
 * adapter that was registered with the hub — the hub stores sockets in a Set,
 * so unregistering needs that same object back, not an equivalent one.
 */
const socketUsers = new Map<string, { userId: string; socket: { send: (data: string) => void } }>();

export const chatRoutes = new Elysia({ prefix: "/chat" })
  /**
   * A ticket to open the socket with. The WebSocket connects straight to this
   * API rather than through the app's `/backend` proxy, so it never carries the
   * session cookie — this is the handover between the two.
   */
  .post("/ws-ticket", async ({ request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) {
      set.status = 401;
      return { error: "Not authenticated" };
    }
    return issueChatTicket(user.id);
  })
  .get("/conversations", async ({ request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) {
      set.status = 401;
      return { error: "Not authenticated" };
    }
    return { conversations: await listConversations(user.id) };
  })
  /** Opens (or re-opens) the thread with one person. Idempotent by design. */
  .post(
    "/conversations",
    async ({ body, request, set }) => {
      const user = await getUserFromRequest(request);
      if (!user) {
        set.status = 401;
        return { error: "Not authenticated" };
      }
      if (body.userId === user.id) {
        set.status = 400;
        return { error: "You cannot message yourself" };
      }

      const other = await prisma.user.findUnique({
        where: { id: body.userId },
        select: { id: true },
      });
      if (!other) {
        set.status = 404;
        return { error: "That person does not have an account yet" };
      }

      const conversationId = await ensureConversation(user.id, other.id, body.listingId ?? null);
      const conversation = await conversationForViewer(conversationId, user.id);
      if (!conversation) {
        set.status = 500;
        return { error: "Could not open conversation" };
      }

      const serialized = await serializeConversation(conversation, user.id);
      // Let the other side's list pick the new thread up without a refresh.
      publish([other.id], { type: "conversation", conversation: serialized });

      return { conversation: serialized };
    },
    {
      body: t.Object({
        userId: t.String({ maxLength: 60 }),
        listingId: t.Optional(t.Union([t.String({ maxLength: 60 }), t.Null()])),
      }),
    },
  )
  .get("/conversations/:id/messages", async ({ params, query, request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) {
      set.status = 401;
      return { error: "Not authenticated" };
    }
    const conversation = await conversationForViewer(params.id, user.id);
    if (!conversation) {
      set.status = 404;
      return { error: "Conversation not found" };
    }

    const limit = Math.min(Number(query.limit) || MESSAGE_PAGE_SIZE, 100);
    const before = query.before ? new Date(String(query.before)) : null;

    const rows = await prisma.message.findMany({
      where: {
        conversationId: params.id,
        ...(before && !Number.isNaN(before.getTime()) ? { createdAt: { lt: before } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    // Queried newest-first for the cursor, returned oldest-first for rendering.
    const messages = await Promise.all(page.reverse().map(serializeMessage));

    return {
      messages,
      hasMore,
      conversation: await serializeConversation(conversation, user.id),
    };
  })
  .post(
    "/conversations/:id/messages",
    async ({ params, body, request, set }) => {
      const user = await getUserFromRequest(request);
      if (!user) {
        set.status = 401;
        return { error: "Not authenticated" };
      }

      const result = await sendMessage({
        conversationId: params.id,
        senderId: user.id,
        body: body.body,
        attachment: body.attachment,
      });
      if (!result.ok) {
        set.status = result.status;
        return { error: result.error };
      }
      return { message: result.message };
    },
    {
      body: t.Object({
        body: t.Optional(t.Union([t.String({ maxLength: MAX_BODY_LENGTH }), t.Null()])),
        attachment: t.Optional(t.Union([attachmentBody, t.Null()])),
      }),
    },
  )
  .post("/conversations/:id/read", async ({ params, request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) {
      set.status = 401;
      return { error: "Not authenticated" };
    }
    const conversation = await conversationForViewer(params.id, user.id);
    if (!conversation) {
      set.status = 404;
      return { error: "Conversation not found" };
    }
    const lastReadAt = await markRead(params.id, user.id);
    return { ok: true, lastReadAt: lastReadAt.toISOString() };
  })
  /**
   * Presigns an attachment upload scoped to one conversation. The size is
   * checked here for a fast failure, and again against the stored object when
   * the message is sent — that second check is the one that counts.
   */
  .post(
    "/conversations/:id/attachments/presign",
    async ({ params, body, request, set }) => {
      const user = await getUserFromRequest(request);
      if (!user) {
        set.status = 401;
        return { error: "Not authenticated" };
      }
      const conversation = await conversationForViewer(params.id, user.id);
      if (!conversation) {
        set.status = 404;
        return { error: "Conversation not found" };
      }

      const typeCheck = validateChatAttachmentType(body.contentType);
      if (!typeCheck.valid) {
        set.status = 400;
        return { error: typeCheck.error };
      }
      const sizeCheck = validateChatAttachmentSize(body.size);
      if (!sizeCheck.valid) {
        set.status = 400;
        return { error: sizeCheck.error };
      }

      try {
        const upload = await generateChatAttachmentUpload({
          contentType: body.contentType,
          conversationId: params.id,
          userId: user.id,
          fileName: body.fileName,
        });
        return { ...upload, maxBytes: MAX_CHAT_ATTACHMENT_BYTES };
      } catch (err) {
        console.error("[chat] attachment presign failed:", err);
        set.status = 500;
        return { error: err instanceof Error ? err.message : "Could not prepare upload" };
      }
    },
    {
      body: t.Object({
        contentType: t.String({ maxLength: 120 }),
        fileName: t.Optional(t.Union([t.String({ maxLength: 200 }), t.Null()])),
        size: t.Number(),
      }),
    },
  )
  /** Drives the unread dot in the nav without loading the whole chat page. */
  .get("/unread-count", async ({ request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) {
      set.status = 401;
      return { error: "Not authenticated" };
    }

    const parts = await prisma.conversationParticipant.findMany({
      where: { userId: user.id },
      select: { conversationId: true, lastReadAt: true },
    });
    if (parts.length === 0) return { unread: 0 };

    const unread = await prisma.message.count({
      where: {
        senderId: { not: user.id },
        OR: parts.map((p) => ({
          conversationId: p.conversationId,
          ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}),
        })),
      },
    });
    return { unread };
  })
  /**
   * The live socket. Authentication happens in `open` by redeeming the ticket
   * from the query string; the client waits for `ready` before sending, and
   * anything arriving on an unauthenticated socket is dropped.
   */
  .ws("/ws", {
    async open(ws) {
      const ticket = (ws.data.query as Record<string, string | undefined>)?.ticket;
      const userId = await redeemChatTicket(ticket);

      if (!userId) {
        ws.raw.send(JSON.stringify({ type: "error", error: "Unauthorized" }));
        ws.raw.close(4401, "Unauthorized");
        return;
      }

      const socket = { send: (data: string) => void ws.raw.send(data) };
      socketUsers.set(ws.id, { userId, socket });
      addSocket(userId, socket);
      ws.raw.send(JSON.stringify({ type: "ready", userId }));
    },

    async message(ws, raw) {
      const userId = socketUsers.get(ws.id)?.userId;
      if (!userId) return;

      let payload: { type?: string; conversationId?: string; body?: string; attachment?: unknown };
      try {
        payload = typeof raw === "string" ? JSON.parse(raw) : (raw as typeof payload);
      } catch {
        return;
      }
      if (!payload?.type) return;

      if (payload.type === "ping") {
        ws.raw.send(JSON.stringify({ type: "pong" }));
        return;
      }

      if (!payload.conversationId) return;

      if (payload.type === "typing") {
        const others = (await participantIds(payload.conversationId)).filter((id) => id !== userId);
        if (others.length) {
          publish(others, {
            type: "typing",
            conversationId: payload.conversationId,
            userId,
          });
        }
        return;
      }

      if (payload.type === "read") {
        const conversation = await conversationForViewer(payload.conversationId, userId);
        if (conversation) await markRead(payload.conversationId, userId);
        return;
      }

      if (payload.type === "message") {
        const result = await sendMessage({
          conversationId: payload.conversationId,
          senderId: userId,
          body: payload.body,
          attachment: (payload.attachment as AttachmentInput | undefined) ?? null,
        });
        if (!result.ok) {
          ws.raw.send(
            JSON.stringify({
              type: "error",
              error: result.error,
              conversationId: payload.conversationId,
            }),
          );
        }
      }
    },

    close(ws) {
      const entry = socketUsers.get(ws.id);
      if (!entry) return;
      socketUsers.delete(ws.id);
      removeSocket(entry.userId, entry.socket);
    },
  });
