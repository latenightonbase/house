"use client";

import Image from "next/image";
import { Info } from "lucide-react";
import { Button, Field, InputAddon, TextInput, Tile } from "@/components/ui";
import { CHAIN_LABELS } from "@/lib/contracts/auctionHouse";
import type { Listing } from "@/lib/marketplace";
import { formatListingAmount, useUsdHint } from "@/lib/tokenPrices";
import type { ListingCheckout } from "@/lib/useListingCheckout";

/**
 * The buyer's inputs — a bid amount for an auction — plus what they will pay
 * and whatever is standing between them and signing. The call to action is
 * left to the caller, which places it where its surface wants it.
 */
export function CheckoutFields({
  listing,
  checkout,
  isAuction,
  authenticated,
  onConnect,
}: {
  listing: Listing;
  checkout: ListingCheckout;
  isAuction: boolean;
  /** Signed out, the wallet notices below would only repeat the Connect button. */
  authenticated: boolean;
  onConnect: () => void;
}) {
  const { busy, minimumBid, bidInvalid, token } = checkout;
  const floor = formatListingAmount(listing, minimumBid);
  const usdHint = useUsdHint(listing, checkout.amount);

  return (
    <div className="space-y-4">
      {isAuction && (
        <Field
          label="Your bid"
          htmlFor="checkout-bid"
          hint={`Minimum ${floor}`}
          error={checkout.bidAmount && bidInvalid ? `Bid at least ${floor}.` : undefined}
        >
          <InputAddon suffix={token.symbol}>
            <TextInput
              id="checkout-bid"
              type="number"
              inputMode="decimal"
              min={minimumBid}
              step={0.01}
              value={checkout.bidAmount}
              onChange={(e) => checkout.setBidAmount(e.target.value)}
              disabled={busy}
              aria-invalid={bidInvalid || undefined}
              className="numeric pr-16 font-semibold"
            />
          </InputAddon>
        </Field>
      )}

      {/* The seller chose the token when they listed, so there is nothing to
          pick — just say what leaves the wallet. */}
      <div className="tile flex items-center gap-3 px-3.5 py-3" aria-live="polite">
        <Image src={token.logo} alt="" width={28} height={28} className="h-7 w-7 shrink-0 rounded-full" />
        <div className="min-w-0">
          <p className="panel-label">You pay in {token.symbol}</p>
          <p className="numeric mt-0.5 truncate text-[14px] font-semibold text-white">
            {checkout.amount > 0 ? formatListingAmount(listing, checkout.amount) : "—"}
            {usdHint && <span className="ml-1.5 text-[12px] font-medium text-caption">{usdHint}</span>}
          </p>
        </div>
      </div>

      {authenticated && !checkout.address && (
        <Tile className="flex gap-2.5 border-warning/30 bg-warning/10 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          <div className="space-y-2">
            <p className="text-[12px] leading-relaxed text-warning">
              Your session is signed in, but the wallet is disconnected. Reconnect it to confirm
              the transaction.
            </p>
            <Button size="sm" variant="accent-outline" onClick={onConnect}>
              Reconnect wallet
            </Button>
          </div>
        </Tile>
      )}

      {authenticated && checkout.address && !checkout.chainSupported && (
        <Tile className="flex gap-2.5 border-warning/30 bg-warning/10 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          <p className="text-[12px] leading-relaxed text-warning">
            Settlement runs on {CHAIN_LABELS[checkout.chainForListing] ?? "Robinhood Chain"}. Your
            wallet will be asked to switch before the transaction.
          </p>
        </Tile>
      )}

      {checkout.error && (
        <Tile
          role="alert"
          className="border-negative/30 bg-negative/10 px-4 py-3 text-[12px] text-negative"
        >
          {checkout.error}
        </Tile>
      )}
    </div>
  );
}
