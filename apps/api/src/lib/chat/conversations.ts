import type { MessageKind } from "@prisma/client";
import { prisma } from "../../db";
import { toIdentity, type PartyIdentity } from "../profileHistory";
import { generatePresignedDownload } from "../s3/presign";
import { isChatImage } from "../s3/fileValidation";
import { isOnline } from "./hub";

/**
 * A DM is one thread per pair of people, for all time. `pairKey` is the two
 * user ids sorted and joined, so "message this person" is idempotent however it
 * is reached — from a listing they won, from a listing you sold them, or from
 * the chat page itself. The listing a thread started from is recorded as
 * context on the conversation, not as a separate thread per listing.
 */

const identityInclude = {
  socials: { orderBy: { platform: "asc" } },
  wallets: { orderBy: { createdAt: "asc" } },
} as const;

const conversationInclude = {
  listing: { select: { id: true, title: true } },
  participants: { include: { user: { include: identityInclude } } },
  messages: { orderBy: { createdAt: "desc" }, take: 1 },
} as const;

export type SerializedAttachment = {
  name: string;
  mime: string;
  size: number;
  /** Short-lived presigned GET — regenerated on every read, never stored. */
  url: string;
  isImage: boolean;
};

export type SerializedMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  kind: MessageKind;
  body: string | null;
  attachment: SerializedAttachment | null;
  createdAt: string;
};

export type SerializedConversation = {
  id: string;
  counterparty: PartyIdentity & { online: boolean };
  listing: { id: string; title: string } | null;
  lastMessageAt: string | null;
  lastMessage: { preview: string; kind: MessageKind; senderId: string } | null;
  unreadCount: number;
  createdAt: string;
};

export function pairKeyFor(a: string, b: string) {
  return [a, b].sort().join(":");
}

/** One line of text for the conversation list, whatever the message was. */
function previewOf(message: { kind: MessageKind; body: string | null }): string {
  if (message.body?.trim()) return message.body.trim().slice(0, 140);
  return message.kind === "IMAGE" ? "Photo" : message.kind === "FILE" ? "File" : "";
}

export async function serializeMessage(message: {
  id: string;
  conversationId: string;
  senderId: string;
  kind: MessageKind;
  body: string | null;
  attachmentKey: string | null;
  attachmentName: string | null;
  attachmentMime: string | null;
  attachmentSize: number | null;
  createdAt: Date;
}): Promise<SerializedMessage> {
  let attachment: SerializedAttachment | null = null;

  if (message.attachmentKey && message.attachmentMime) {
    const isImage = isChatImage(message.attachmentMime);
    try {
      attachment = {
        name: message.attachmentName ?? "attachment",
        mime: message.attachmentMime,
        size: message.attachmentSize ?? 0,
        // Images render in the thread, so they are served inline; a PDF is
        // handed over as a download with its original filename.
        // Long enough that an open thread does not start showing broken
        // images, short enough that a copied URL is not a lasting leak.
        url: await generatePresignedDownload({
          key: message.attachmentKey,
          fileName: message.attachmentName,
          inline: isImage,
          expiresIn: 900,
        }),
        isImage,
      };
    } catch (err) {
      console.error("[chat] could not sign attachment:", err);
    }
  }

  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    kind: message.kind,
    body: message.body,
    attachment,
    createdAt: message.createdAt.toISOString(),
  };
}

type ConversationRow = {
  id: string;
  createdAt: Date;
  lastMessageAt: Date | null;
  listing: { id: string; title: string } | null;
  participants: Array<{
    userId: string;
    lastReadAt: Date | null;
    user: Parameters<typeof toIdentity>[0];
  }>;
  messages: Array<{ kind: MessageKind; body: string | null; senderId: string }>;
};

export async function serializeConversation(
  conversation: ConversationRow,
  viewerId: string,
): Promise<SerializedConversation> {
  const other = conversation.participants.find((p) => p.userId !== viewerId);
  const mine = conversation.participants.find((p) => p.userId === viewerId);
  const identity = toIdentity(other?.user ?? null);

  // Anything the other side sent after our last read. A thread never read at
  // all counts every incoming message.
  const unreadCount = await prisma.message.count({
    where: {
      conversationId: conversation.id,
      senderId: { not: viewerId },
      ...(mine?.lastReadAt ? { createdAt: { gt: mine.lastReadAt } } : {}),
    },
  });

  const last = conversation.messages[0] ?? null;

  return {
    id: conversation.id,
    counterparty: {
      ...identity,
      online: other ? isOnline(other.userId) : false,
    },
    listing: conversation.listing,
    lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
    lastMessage: last
      ? { preview: previewOf(last), kind: last.kind, senderId: last.senderId }
      : null,
    unreadCount,
    createdAt: conversation.createdAt.toISOString(),
  };
}

/**
 * Finds the thread between two people, creating it if this is the first
 * contact. Racing calls are resolved by the unique `pairKey` — the loser of the
 * race re-reads rather than erroring, so two people pressing "Contact" at the
 * same moment still land in one thread.
 */
export async function ensureConversation(
  viewerId: string,
  otherUserId: string,
  listingId?: string | null,
): Promise<string> {
  if (viewerId === otherUserId) throw new Error("Cannot start a conversation with yourself");

  const pairKey = pairKeyFor(viewerId, otherUserId);
  const existing = await prisma.conversation.findUnique({
    where: { pairKey },
    select: { id: true, listingId: true },
  });
  if (existing) {
    // Keep the first context the thread was opened from; do not overwrite it.
    if (!existing.listingId && listingId) {
      await prisma.conversation.update({
        where: { id: existing.id },
        data: { listingId },
      });
    }
    return existing.id;
  }

  try {
    const created = await prisma.conversation.create({
      data: {
        pairKey,
        listingId: listingId ?? null,
        participants: {
          create: [{ userId: viewerId }, { userId: otherUserId }],
        },
      },
      select: { id: true },
    });
    return created.id;
  } catch {
    const raced = await prisma.conversation.findUnique({
      where: { pairKey },
      select: { id: true },
    });
    if (!raced) throw new Error("Could not open conversation");
    return raced.id;
  }
}

/** A conversation the viewer belongs to, or null — the only authorization gate. */
export async function conversationForViewer(conversationId: string, viewerId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: conversationInclude,
  });
  if (!conversation) return null;
  if (!conversation.participants.some((p) => p.userId === viewerId)) return null;
  return conversation;
}

export async function participantIds(conversationId: string): Promise<string[]> {
  const rows = await prisma.conversationParticipant.findMany({
    where: { conversationId },
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
}

export async function listConversations(viewerId: string): Promise<SerializedConversation[]> {
  const rows = await prisma.conversation.findMany({
    where: { participants: { some: { userId: viewerId } } },
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
    include: conversationInclude,
  });
  return Promise.all(rows.map((row) => serializeConversation(row, viewerId)));
}

export { conversationInclude };
