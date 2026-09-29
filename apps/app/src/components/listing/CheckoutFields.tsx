"use client";

import { formatUnits } from "viem";
import { Info } from "lucide-react";
import { Button, Field, InputAddon, TextInput, Tile } from "@/components/ui";
import { CHAIN_LABELS } from "@/lib/contracts/auctionHouse";
import type { ListingCheckout } from "@/lib/useListingCheckout";
import { TokenPicker } from "./TokenPicker";

/** What the buyer will actually send, in the token they picked. */
function payHint(checkout: ListingCheckout) {
  const { token, usdAmount, quotedAmount } = checkout;
  if (token.pegged) {
    return usdAmount > 0
      ? `You pay ${usdAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${token.symbol} · $1.00 each.`
      : `$1.00 per ${token.symbol}.`;
  }
  if (quotedAmount !== undefined) {
    const units = Number(formatUnits(quotedAmount, token.decimals));
    // Precision follows size: 10,706 LNOC needs no decimals, 0.0042 needs four.
    const amount = units.toLocaleString(undefined, {
      maximumFractionDigits: units >= 1000 ? 0 : units >= 1 ? 2 : 4,
    });
    return `About ${amount} ${token.symbol} at the current rate.`;
  }
  return `Converted from USD at the rate the contract publishes for ${token.symbol}.`;
}

/**
 * The buyer's inputs — bid amount for an auction, then the settle-in token —
 * plus whatever is standing between them and signing. The call to action is
 * left to the caller, which places it where its surface wants it.
 */
export function CheckoutFields({
  checkout,
  isAuction,
  authenticated,
  onConnect,
}: {
  checkout: ListingCheckout;
  isAuction: boolean;
  /** Signed out, the wallet notices below would only repeat the Connect button. */
  authenticated: boolean;
  onConnect: () => void;
}) {
  const { busy, minimumBid, bidInvalid, tokens } = checkout;
  const floor = `$${minimumBid.toLocaleString()}`;

  return (
    <div className="space-y-4">
      {isAuction && (
        <Field
          label="Your bid"
          htmlFor="checkout-bid"
          hint={`Minimum ${floor}`}
          error={checkout.bidAmount && bidInvalid ? `Bid at least ${floor}.` : undefined}
        >
          <InputAddon prefix="$" suffix="USD">
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
              className="numeric pl-7 pr-14 font-semibold"
            />
          </InputAddon>
        </Field>
      )}

      {tokens.length > 1 && (
        <div className="space-y-1.5">
          <p id="checkout-pay-with" className="panel-label">
            Pay with
          </p>
          <TokenPicker
            tokens={tokens}
            value={checkout.token.address}
            onChange={checkout.setPayTokenAddress}
            disabled={busy}
            labelledBy="checkout-pay-with"
          />
          <p className="text-[11px] text-caption" aria-live="polite">
            {payHint(checkout)}
          </p>
        </div>
      )}

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
