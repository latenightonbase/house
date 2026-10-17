import { prisma } from "../../db";
import { chatUrl, sendAuctionWon, sendListingPurchased, sendListingSold } from "../email";
import { toIdentity } from "../profileHistory";
import { formatTokenAmount } from "../tokens";
import {
  conversationForViewer,
  ensureConversation,
  serializeConversation,
  serializeMessage,
} from "./conversations";
import { publish } from "./hub";

/**
 * The hand-off after a sale: a fixed-price purchase or a settled auction.
 *
 * Buyer and seller are put in the same thread with one opening message from
 * each side, so both inboxes show something waiting from the other person —
 * neither has to go looking for who they traded with. Then each gets an email
 * that links straight into that thread.
 *
 * The opening messages deliberately leave both `lastReadAt`s alone (unlike a
 * normal send, which counts as a read for the sender): each side's own message
 * is never unread for them anyway, and the other side's message is what lights
 * up their unread badge.
 *
 * Nothing here throws. The sale is already recorded by the time this runs, and
 * a failed chat write or email must not turn a settled purchase into an error.
 */

type Via = "purchase" | "auction";

const partyInclude = {
  socials: { orderBy: { platform: "asc" } },
  wallets: { orderBy: { createdAt: "asc" } },
} as const;

function openingLines(via: Via, title: string, amount: string) {
  return via === "auction"
    ? {
        buyer: `Hi! I just won your auction for “${title}” at ${amount}. Messaging you here so we can sort out the details.`,
        seller: `Congrats on winning “${title}”! Reply here and we can coordinate everything for delivery.`,
      }
    : {
        buyer: `Hi! I just bought “${title}” for ${amount}. Messaging you here so we can sort out the details.`,
        seller: `Thanks for buying “${title}”! Reply here and we can coordinate everything for delivery.`,
      };
}

/** Opens (or reuses) the pair's thread and posts both opening messages. */
async function openDealThread(opts: {
  listingId: string;
  sellerId: string;
  buyerId: string;
  lines: { buyer: string; seller: string };
}): Promise<string> {
  const conversationId = await ensureConversation(opts.buyerId, opts.sellerId, opts.listingId);

  // The seller's reply is stamped just after the buyer's so the thread always
  // reads buyer-then-seller, whatever the clock resolution.
  const buyerAt = new Date();
  const sellerAt = new Date(buyerAt.getTime() + 1);

  const [fromBuyer, fromSeller] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId,
        senderId: opts.buyerId,
        kind: "TEXT",
        body: opts.lines.buyer,
        createdAt: buyerAt,
      },
    }),
    prisma.message.create({
      data: {
        conversationId,
        senderId: opts.sellerId,
        kind: "TEXT",
        body: opts.lines.seller,
        createdAt: sellerAt,
      },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: sellerAt },
    }),
  ]);

  const recipients = [opts.buyerId, opts.sellerId];
  for (const row of [fromBuyer, fromSeller]) {
    publish(recipients, { type: "message", conversationId, message: await serializeMessage(row) });
  }

  // Messages first, then the thread itself: a client that already lists this
  // thread bumps it from the messages and ignores the duplicate; one that has
  // never seen it adds it from here, already carrying the right unread count.
  for (const viewerId of recipients) {
    const conversation = await conversationForViewer(conversationId, viewerId);
    if (!conversation) continue;
    publish([viewerId], {
      type: "conversation",
      conversation: await serializeConversation(conversation, viewerId),
    });
  }

  return conversationId;
}

type Introduction = {
  via: Via;
  listing: { id: string; title: string; currency: string };
  sellerId: string;
  buyerId: string;
  amount: number;
};

export async function introduceBuyerAndSeller(input: Introduction) {
  try {
    await introduce(input);
  } catch (err) {
    console.error(`[deal-thread] hand-off failed for ${input.listing.id}:`, err);
  }
}

async function introduce(input: Introduction) {
  const { via, listing, sellerId, buyerId, amount } = input;
  if (sellerId === buyerId) return;

  const [seller, buyer] = await Promise.all([
    prisma.user.findUnique({ where: { id: sellerId }, include: partyInclude }),
    prisma.user.findUnique({ where: { id: buyerId }, include: partyInclude }),
  ]);
  if (!seller || !buyer) return;

  const price = formatTokenAmount(amount, listing.currency);

  let conversationId: string | null = null;
  try {
    conversationId = await openDealThread({
      listingId: listing.id,
      sellerId,
      buyerId,
      lines: openingLines(via, listing.title, price),
    });
  } catch (err) {
    console.error(`[deal-thread] could not open thread for ${listing.id}:`, err);
  }

  const threadUrl = conversationId ? chatUrl(conversationId) : null;
  const priced = { title: listing.title, listingId: listing.id, amount, currency: listing.currency };

  // Unverified addresses are skipped, as with every other transactional email.
  if (buyer.email && buyer.emailVerifiedAt) {
    const counterpart = { counterpartName: toIdentity(seller).name, chatUrl: threadUrl };
    const sent =
      via === "auction"
        ? sendAuctionWon(buyer.email, { ...priced, ...counterpart })
        : sendListingPurchased(buyer.email, { ...priced, ...counterpart });
    await sent.catch((err) => console.error(`[deal-thread] buyer email failed (${via}):`, err));
  }

  if (seller.email && seller.emailVerifiedAt) {
    await sendListingSold(seller.email, {
      ...priced,
      via,
      counterpartName: toIdentity(buyer).name,
      chatUrl: threadUrl,
    }).catch((err) => console.error(`[deal-thread] seller email failed (${via}):`, err));
  }
}
