"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BaseError, UserRejectedRequestError } from "viem";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { useOpenConnect } from "@/components/connect-intent";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Gavel,
  Info,
  Loader2,
  Package,
  Sparkles,
  Tag,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ListingPreview } from "@/components/ListingPreview";
import { useSession } from "@/components/SessionProvider";
import {
  Badge,
  Button,
  Field,
  ImageUploader,
  InputAddon,
  Panel,
  PanelHeader,
  TextArea,
  TextInput,
  Tile,
} from "@/components/ui";
import { TokenPicker } from "@/components/listing/TokenPicker";
import { TokenMark } from "@/components/listing/TokenMark";
import { formatCount } from "@/lib/api";
import {
  createListing,
  type Listing,
  type ListingKind,
  type NewListingInput,
  type PricingType,
} from "@/lib/marketplace";
import {
  auctionHouseAbi,
  auctionHouseAddress,
  CHAIN_LABELS,
  durationHoursUntil,
  findPaymentToken,
  knownPaymentToken,
  MAX_ACTIVE_LISTINGS,
  paymentTokens,
  toTokenUnits,
  USDG,
  type PaymentToken,
} from "@/lib/contracts/auctionHouse";
import {
  formatTokenAmount,
  formatUsd,
  usdPrice,
  useTokenLookup,
  useTokenPrices,
  type TokenLookup,
} from "@/lib/tokenPrices";
import { robinhood } from "@/lib/chains";
import { cn, shortAddress, walletFallbackAvatar } from "@/lib/utils";

const DURATION_PRESETS = [
  { label: "24 hours", hours: 24 },
  { label: "3 days", hours: 72 },
  { label: "7 days", hours: 168 },
  { label: "14 days", hours: 336 },
  { label: "30 days", hours: 720 },
];

/** `datetime-local` wants a local-time string with no zone suffix. */
function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

type Step = "form" | "switching" | "signing" | "confirming" | "publishing" | "done";

const STEP_LABEL: Record<Exclude<Step, "form" | "done">, string> = {
  switching: "Switch your wallet to Robinhood Chain…",
  signing: "Confirm the transaction in your wallet…",
  confirming: "Waiting for the transaction to confirm…",
  publishing: "Publishing to the marketplace…",
};

function listingWriteError(err: unknown): string {
  if (err instanceof UserRejectedRequestError) {
    return "You rejected the transaction in your wallet.";
  }
  if (err instanceof BaseError) {
    if (err.walk((e) => e instanceof UserRejectedRequestError)) {
      return "You rejected the transaction in your wallet.";
    }
    const msg = err.shortMessage || err.message;
    if (/Token not accepted/.test(msg)) {
      return "The marketplace contract doesn't accept this token yet. Pick USDG or LNOC for now.";
    }
    if (/Token blocked/.test(msg)) {
      return "This token has been blocked from new listings. Pick another one.";
    }
    if (/Token is not a contract/.test(msg)) {
      return "There is no token contract at that address on Robinhood Chain.";
    }
    if (/Account type|smart/i.test(msg)) {
      return "This wallet can't sign on Robinhood Chain. Connect MetaMask or Rainbow and try again.";
    }
    if (/chain/i.test(msg) && /mismatch|supported|unrecognized|switch/i.test(msg)) {
      return "Switch your wallet to Robinhood Chain and try again.";
    }
    return msg;
  }
  if (err instanceof Error) return err.message;
  return "Could not create the listing.";
}

const LISTING_CHAIN_ID = robinhood.id;

type ListingDraft = {
  title: string;
  description: string;
  kind: ListingKind;
  pricingType: PricingType;
  /** The named token picked — USDG or LNOC. Ignored while `customToken` is set. */
  tokenAddress: string;
  /** Any other ERC-20's contract address, as typed. Takes over from the picker. */
  customToken: string;
  price: string;
  endDate: string;
  /** Already on S3 — the draft only remembers where. */
  posterUrl: string | null;
};

function defaultDraft(): ListingDraft {
  return {
    title: "",
    description: "",
    kind: "SERVICE",
    pricingType: "FIXED",
    tokenAddress: USDG.address,
    customToken: "",
    price: "",
    endDate: toLocalInputValue(new Date(Date.now() + 7 * 86_400_000)),
    posterUrl: null,
  };
}

function draftKey(userId: string) {
  return `house:listing-draft:${userId}`;
}

function loadDraft(userId: string): ListingDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ListingDraft>;
    const base = defaultDraft();
    return {
      title: typeof parsed.title === "string" ? parsed.title : base.title,
      description: typeof parsed.description === "string" ? parsed.description : base.description,
      kind: parsed.kind === "GOOD" ? "GOOD" : "SERVICE",
      pricingType: parsed.pricingType === "AUCTION" ? "AUCTION" : "FIXED",
      tokenAddress: findPaymentToken(LISTING_CHAIN_ID, parsed.tokenAddress).address,
      customToken: typeof parsed.customToken === "string" ? parsed.customToken : base.customToken,
      price: typeof parsed.price === "string" ? parsed.price : base.price,
      endDate: typeof parsed.endDate === "string" ? parsed.endDate : base.endDate,
      posterUrl: typeof parsed.posterUrl === "string" ? parsed.posterUrl : base.posterUrl,
    };
  } catch {
    return null;
  }
}

function saveDraft(userId: string, draft: ListingDraft) {
  try {
    localStorage.setItem(draftKey(userId), JSON.stringify(draft));
  } catch {
    /* quota / private mode */
  }
}

function dropDraft(userId: string) {
  try {
    localStorage.removeItem(draftKey(userId));
  } catch {
    /* ignore */
  }
}

export default function NewListingPage() {
  const router = useRouter();
  const { status, user } = useSession();
  const openConnect = useOpenConnect();
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: LISTING_CHAIN_ID });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<ListingKind>("SERVICE");
  const [pricingType, setPricingType] = useState<PricingType>("FIXED");
  const [tokenAddress, setTokenAddress] = useState<string>(USDG.address);
  const [customToken, setCustomToken] = useState("");
  const [price, setPrice] = useState("");
  const [endDate, setEndDate] = useState(() =>
    toLocalInputValue(new Date(Date.now() + 7 * 86_400_000)),
  );
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [posterUploading, setPosterUploading] = useState(false);
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);

  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Listing | null>(null);
  /** Set when the chain write landed but the marketplace persist failed. */
  const [pendingPersist, setPendingPersist] = useState<NewListingInput | null>(null);

  const applyDraft = (draft: ListingDraft) => {
    setTitle(draft.title);
    setDescription(draft.description);
    setKind(draft.kind);
    setPricingType(draft.pricingType);
    setTokenAddress(draft.tokenAddress);
    setCustomToken(draft.customToken);
    setPrice(draft.price);
    setEndDate(draft.endDate);
    setPosterUrl(draft.posterUrl);
  };

  const resetForm = () => {
    applyDraft(defaultDraft());
    setError(null);
    if (user?.id) dropDraft(user.id);
  };

  const contractAddress = auctionHouseAddress(LISTING_CHAIN_ID);
  const tokens = paymentTokens(LISTING_CHAIN_ID);
  const prices = useTokenPrices();

  // A pasted address takes over from the picker. It is looked up through the
  // API, which gets its name, logo, decimals and price from DexScreener and
  // CoinGecko.
  const customAddress = customToken.trim();
  const usingCustom = customAddress.length > 0;
  const customValid = /^0x[a-fA-F0-9]{40}$/.test(customAddress);
  const lookup = useTokenLookup(usingCustom && customValid ? customAddress : undefined);
  const customPaymentToken = useMemo<PaymentToken | null>(() => {
    if (lookup.status !== "found") return null;
    const found = lookup.token;
    // Pasting USDG's or LNOC's own address is the same as picking it.
    return (
      knownPaymentToken(LISTING_CHAIN_ID, found.address) ?? {
        address: found.address,
        symbol: found.symbol,
        name: found.name,
        decimals: found.decimals,
        pegged: false,
        logo: found.logoUrl ?? undefined,
        custom: true,
      }
    );
  }, [lookup]);
  /** The token the listing is priced in — null while a pasted address is unresolved. */
  const selectedToken: PaymentToken | null = usingCustom
    ? customPaymentToken
    : findPaymentToken(LISTING_CHAIN_ID, tokenAddress);
  // Everything that only labels the form falls back to USDG while a pasted
  // address resolves; validation keeps that from ever being submitted.
  const token = selectedToken ?? USDG;
  const unitUsd =
    selectedToken?.custom && lookup.status === "found"
      ? lookup.token.priceUsd
      : selectedToken
        ? usdPrice(prices, selectedToken)
        : null;
  const chainSupported = chainId === LISTING_CHAIN_ID;

  // The contract refuses a fourth simultaneously open listing, so show where
  // the wallet stands before it spends gas finding out.
  const { data: activeOnchain } = useReadContract({
    address: contractAddress,
    abi: auctionHouseAbi,
    functionName: "getActiveAuctionsByOwner",
    args: address ? [address] : undefined,
    chainId: LISTING_CHAIN_ID,
    query: { enabled: Boolean(contractAddress && address) },
  });
  const activeCount = activeOnchain?.length ?? 0;
  const atListingCap = Boolean(contractAddress) && activeCount >= MAX_ACTIVE_LISTINGS;

  useEffect(() => {
    if (!user?.id || hydratedFor === user.id) return;
    const draft = loadDraft(user.id);
    if (draft) applyDraft(draft);
    setHydratedFor(user.id);
  }, [user?.id, hydratedFor]);

  useEffect(() => {
    if (!user?.id || hydratedFor !== user.id) return;
    saveDraft(user.id, {
      title,
      description,
      kind,
      pricingType,
      tokenAddress,
      customToken,
      price,
      endDate,
      posterUrl,
    });
  }, [
    user?.id,
    hydratedFor,
    title,
    description,
    kind,
    pricingType,
    tokenAddress,
    customToken,
    price,
    endDate,
    posterUrl,
  ]);

  const parsedEnd = useMemo(() => (endDate ? new Date(endDate) : null), [endDate]);
  const priceNumber = Number(price);
  const priceUsd =
    selectedToken && unitUsd != null && Number.isFinite(priceNumber) && priceNumber > 0
      ? priceNumber * unitUsd
      : null;
  // The form takes cents, but a token with fewer decimals cannot hold them.
  const priceDecimals = Math.min(2, token.decimals);

  const validationError = useMemo(() => {
    if (posterUploading) return "Wait for the poster to finish uploading.";
    if (title.trim().length < 2) return "Give your listing a name.";
    if (usingCustom) {
      if (!customValid) return "Enter a token contract address — 0x followed by 40 characters.";
      if (lookup.status === "loading" || lookup.status === "idle") return "Looking up the token…";
      if (lookup.status === "error") return lookup.error;
    }
    if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
      return pricingType === "AUCTION"
        ? "Set a minimum bid above zero."
        : "Set a price above zero.";
    }
    const scale = 10 ** priceDecimals;
    if (Math.round(priceNumber * scale) !== priceNumber * scale) {
      return priceDecimals === 0
        ? `${token.symbol} has no decimals — use a whole number.`
        : `Use at most ${priceDecimals === 1 ? "one decimal place" : "two decimal places"}.`;
    }
    if (priceNumber > 1e15) return "That price is too large.";
    if (!parsedEnd || Number.isNaN(parsedEnd.getTime()))
      return "Pick when the listing ends.";
    if (parsedEnd.getTime() <= Date.now()) return "The end time has to be in the future.";
    return null;
  }, [
    posterUploading,
    title,
    usingCustom,
    customValid,
    lookup,
    priceNumber,
    priceDecimals,
    token.symbol,
    pricingType,
    parsedEnd,
  ]);

  /** Identity shown on the preview card — the profile a listing is created under. */
  const previewCreator = useMemo(() => {
    const social = user?.socials.find((s) => s.displayName || s.username) ?? user?.socials[0];
    const wallet = user?.wallets.find((w) => w.isPrimary) ?? user?.wallets[0];
    const reach = user?.socials.reduce((sum, s) => sum + (s.followerCount ?? 0), 0) ?? 0;

    return {
      id: "preview",
      wallet: wallet?.address,
      displayName: user?.username
        ? `@${user.username}`
        : social?.displayName ||
          social?.username ||
          (wallet ? shortAddress(wallet.address) : "You"),
      username: user?.username ?? social?.username ?? undefined,
      avatarUrl: user?.avatarUrl || walletFallbackAvatar(wallet?.address),
      verified: false,
      reach: reach ? formatCount(reach) : "—",
    };
  }, [user]);

  const previewListing: Listing = {
    id: "preview",
    title: title.trim() || "Your listing name",
    description: description.trim() || undefined,
    category: "OTHER",
    kind,
    pricingType,
    price: Number.isFinite(priceNumber) && priceNumber > 0 ? priceNumber : 0,
    currency: token.symbol,
    tokenAddress: token.address,
    tokenName: token.symbol,
    tokenDecimals: token.decimals,
    slotsAvailable: 1,
    posterUrl: posterUrl ?? undefined,
    endDate:
      parsedEnd && !Number.isNaN(parsedEnd.getTime()) ? parsedEnd.toISOString() : undefined,
    status: "ACTIVE",
    creator: previewCreator,
  };

  const previewRows = [
    { label: "Type", value: kind === "GOOD" ? "Physical good" : "Service" },
    {
      label: "Sells as",
      value: pricingType === "AUCTION" ? "Auction — open to bids" : "Flat price",
    },
    {
      label: "Closes",
      value:
        parsedEnd && !Number.isNaN(parsedEnd.getTime())
          ? parsedEnd.toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })
          : "Not set",
    },
    {
      label: "Settlement",
      value: `Escrowed on ${CHAIN_LABELS[LISTING_CHAIN_ID]} · ${durationHoursUntil(
        parsedEnd && !Number.isNaN(parsedEnd.getTime()) ? parsedEnd : new Date(),
      )}h`,
    },
    { label: "Paid in", value: selectedToken ? token.symbol : "—" },
    ...(priceUsd != null && !token.pegged
      ? [{ label: "Worth today", value: `≈ ${formatUsd(priceUsd)}` }]
      : []),
  ];

  const busy = step !== "form" && step !== "done";
  // Why the submit button is off, said on the bar that holds it — the cap has
  // its own banner at the top, but that is a scroll away from the button.
  const disabledReason = atListingCap
    ? `You have ${activeCount}/${MAX_ACTIVE_LISTINGS} open listings. Settle or let one expire before adding another.`
    : validationError;

  function listingPayload(
    listingId: string,
    hash: `0x${string}`,
    endsAt: Date,
  ): NewListingInput {
    return {
      id: listingId,
      title,
      description: description.trim() || undefined,
      kind,
      pricingType,
      price: priceNumber,
      currency: token.symbol,
      // The same instant the on-chain duration was derived from, so the API's
      // check of the contract's deadline against this lines up.
      endDate: endsAt.toISOString(),
      // A fixed-price listing settles once on-chain, so it only ever has one slot.
      slotsAvailable: 1,
      posterUrl: posterUrl ?? undefined,
      // Always present: the listing is on-chain before it is ever saved.
      txHash: hash,
      chainId: LISTING_CHAIN_ID,
      contractAddress: contractAddress!,
      tokenAddress: token.address,
      tokenName: token.symbol,
    };
  }

  async function persistListing(input: NewListingInput) {
    setStep("publishing");
    const listing = await createListing(input);
    setPendingPersist(null);
    setCreated(listing);
    setStep("done");
    if (user?.id) dropDraft(user.id);
  }

  /**
   * One path for everybody: sign the AuctionHouse transaction, then save. The
   * listing is live as soon as the API has checked it against the contract.
   */
  async function handleSubmit() {
    if (validationError || !parsedEnd) {
      setError(validationError);
      return;
    }
    setError(null);

    if (!contractAddress) {
      setError("AuctionHouse is not configured for Robinhood Chain.");
      return;
    }
    if (!address) {
      openConnect();
      return;
    }

    if (pendingPersist) {
      try {
        // Only the on-chain half of the saved payload is fixed. The poster,
        // title and description are read fresh, so a poster re-uploaded after
        // the API refused the first one is the one that gets sent.
        await persistListing({
          ...pendingPersist,
          title,
          description: description.trim() || undefined,
          posterUrl: posterUrl ?? undefined,
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "On-chain listing exists — retry saving it to the marketplace.",
        );
        setStep("form");
      }
      return;
    }

    // Fixed before signing so the duration written on-chain and the end date
    // sent to the API come from the same instant. Deriving either one after the
    // transaction confirms would put them a confirmation apart, and the API
    // checks the contract's deadline against exactly this.
    const endsAt = parsedEnd;

    const listingId = crypto.randomUUID();
    try {
      // Don't pass `chainId` into writeContract — viem asserts the connector
      // chain first and throws before eth_sendTransaction, so the wallet
      // never opens. Switch here, then request the signature on the
      // connector's current chain.
      if (!chainSupported) {
        setStep("switching");
        if (!switchChainAsync) {
          throw new Error("Switch your wallet to Robinhood Chain and try again.");
        }
        await switchChainAsync({ chainId: LISTING_CHAIN_ID });
      }

      setStep("signing");
      const hours = BigInt(durationHoursUntil(endsAt));
      // Same call for either token — the contract only needs the token and an
      // amount in its own units.
      const args = [listingId, token.address, hours, toTokenUnits(priceNumber, token)] as const;
      const request = {
        address: contractAddress,
        abi: auctionHouseAbi,
        args,
        account: address,
      } as const;

      const hash =
        pricingType === "AUCTION"
          ? await writeContractAsync({ ...request, functionName: "startAuction" })
          : await writeContractAsync({
              ...request,
              functionName: "startFixedPriceListing",
            });

      setStep("confirming");
      if (!publicClient) throw new Error("Could not reach Robinhood Chain.");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status === "reverted") {
        throw new Error("The transaction reverted.");
      }

      const input = listingPayload(listingId, hash, endsAt);
      try {
        await persistListing(input);
      } catch (err) {
        setPendingPersist(input);
        setError(
          err instanceof Error
            ? `${err.message} The listing is on-chain — retry to save it to the marketplace.`
            : "On-chain listing exists — retry saving it to the marketplace.",
        );
        setStep("form");
      }
    } catch (err) {
      setError(listingWriteError(err));
      setStep("form");
    }
  }

  if (status === "loading") {
    return <div className="card h-64 animate-pulse" />;
  }

  if (status !== "authenticated") {
    return (
      <div className="space-y-4 max-w-2xl">
        <PageHeader
          title="Create a listing"
          subtitle="Sell a piece of your media or your time. Price it in USDG, LNOC or any Robinhood Chain token — settlement runs through the AuctionHouse contract."
        />
        <Panel className="flex flex-col items-start gap-3">
          <p className="text-sm text-caption">
            Connect and sign in with your wallet to list — it is the account buyers pay out
            to.
          </p>
          <Button onClick={() => openConnect()} className="w-full sm:w-auto">
            Connect wallet
          </Button>
        </Panel>
      </div>
    );
  }

  if (step === "done" && created) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Panel className="space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-positive shrink-0" />
            <div>
              <h1 className="text-lg font-bold text-foreground">Listing is live</h1>
              <p className="text-[13px] text-caption">
                {`${created.title} is now on the marketplace, priced in ${created.tokenName ?? token.symbol}.`}
              </p>
            </div>
          </div>

          {created.txHash && (
            <Tile className="px-3 py-2.5 text-[12px] text-caption break-all">
              Transaction: {created.txHash}
            </Tile>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => router.push("/")}>View on Discover</Button>
            <Button
              variant="accent-outline"
              onClick={() => {
                setCreated(null);
                setPendingPersist(null);
                resetForm();
                setStep("form");
              }}
            >
              Create another
            </Button>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-6xl">
      <PageHeader
        title="Create a listing"
        subtitle="Sell a piece of your media or your time. Set a flat price for instant booking, or open it to bids."
      />

      {!address && (
        <Tile className="border-warning/30 bg-warning/10 px-4 py-3 flex gap-2.5">
          <Info className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-[12px] text-warning leading-relaxed">
              Your session is signed in, but the wallet is disconnected. Reconnect
              it to confirm the listing transaction.
            </p>
            <Button size="sm" variant="accent-outline" onClick={openConnect}>
              Reconnect wallet
            </Button>
          </div>
        </Tile>
      )}

      {address && !chainSupported && (
        <Tile className="border-warning/30 bg-warning/10 px-4 py-3 flex gap-2.5">
          <Info className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <p className="text-[12px] text-warning leading-relaxed">
            Listings settle on Robinhood Chain. Your wallet will be asked to switch
            before the transaction.
          </p>
        </Tile>
      )}

      {atListingCap && (
        <Tile className="border-negative/30 bg-negative/10 px-4 py-3 text-[12px] text-negative">
          You already have {activeCount} open listings on-chain. The contract allows{" "}
          {MAX_ACTIVE_LISTINGS} at a time — settle or let one expire before adding another.
        </Tile>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px] items-start">
        <div className="space-y-4 min-w-0">
          <Panel className="space-y-5">
            <PanelHeader label="What you are selling" />

            <div className="space-y-1.5">
              <p id="listing-kind" className="panel-label">
                Type
              </p>
              <div role="group" aria-labelledby="listing-kind" className="grid grid-cols-2 gap-2">
                <PricingOption
                  active={kind === "SERVICE"}
                  onClick={() => setKind("SERVICE")}
                  disabled={busy}
                  icon={<Sparkles className="w-4 h-4" />}
                  title="Service"
                  body="Something you do — a post, a shoutout, a call."
                />
                <PricingOption
                  active={kind === "GOOD"}
                  onClick={() => setKind("GOOD")}
                  disabled={busy}
                  icon={<Package className="w-4 h-4" />}
                  title="Physical good"
                  body="Something you ship or hand over."
                />
              </div>
            </div>

            <Field
              label="Name"
              htmlFor="title"
              hint="What a brand sees first — be concrete."
            >
              <TextInput
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="60-second mid-roll read"
                maxLength={120}
                disabled={busy}
              />
            </Field>

            <Field
              label="Description"
              htmlFor="description"
              optional
              hint="What the buyer gets, and anything you will not do."
            >
              <TextArea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A host-read spot in the Tuesday show, script approved by you, kept up for 30 days."
                rows={4}
                maxLength={2000}
                disabled={busy}
              />
            </Field>

            <Field
              label="Poster"
              optional
              hint="Upload a square (1:1) image for best visibility — cards in the marketplace are square. Shown on Discover, the listing page and your profile."
            >
              <div className="max-w-56">
                <ImageUploader
                  variant="poster"
                  value={posterUrl}
                  onUploaded={setPosterUrl}
                  onUploadingChange={setPosterUploading}
                  disabled={busy}
                  alt={title.trim() ? `Poster for ${title.trim()}` : "Listing poster"}
                />
              </div>
            </Field>
          </Panel>

          <Panel className="space-y-5">
            <PanelHeader label="How it sells" />

            <div className="grid grid-cols-2 gap-2">
              <PricingOption
                active={pricingType === "FIXED"}
                onClick={() => setPricingType("FIXED")}
                disabled={busy}
                icon={<Tag className="w-4 h-4" />}
                title="Flat price"
                body="First buyer at your price gets it."
              />
              <PricingOption
                active={pricingType === "AUCTION"}
                onClick={() => setPricingType("AUCTION")}
                disabled={busy}
                icon={<Gavel className="w-4 h-4" />}
                title="Auction"
                body="Highest bid at close wins."
              />
            </div>

            <div className="space-y-1.5">
              <p id="listing-token" className="panel-label">
                Get paid in
              </p>
              <TokenPicker
                tokens={tokens}
                value={usingCustom ? "" : token.address}
                onChange={(next) => {
                  setTokenAddress(next);
                  setCustomToken("");
                }}
                disabled={busy}
                labelledBy="listing-token"
                detail={(t) => {
                  const unit = usdPrice(prices, t);
                  return unit == null ? "Price unavailable" : `1 ${t.symbol} ≈ ${formatUsd(unit)}`;
                }}
              />

              <div className="pt-1.5">
                <label htmlFor="custom-token" className="text-[12px] font-medium text-caption">
                  Or paste any Robinhood Chain token address
                </label>
                <TextInput
                  id="custom-token"
                  value={customToken}
                  onChange={(e) => setCustomToken(e.target.value)}
                  placeholder="0x…"
                  autoComplete="off"
                  spellCheck={false}
                  className="numeric mt-1.5 font-mono text-[13px]"
                  aria-describedby="custom-token-status"
                  aria-invalid={usingCustom && (!customValid || lookup.status === "error") || undefined}
                  disabled={busy}
                />
              </div>

              {usingCustom && (
                <CustomTokenCard
                  id="custom-token-status"
                  valid={customValid}
                  lookup={lookup}
                  amount={priceNumber > 0 && Number.isFinite(priceNumber) ? priceNumber : null}
                  onClear={() => setCustomToken("")}
                  disabled={busy}
                />
              )}

              <p className="text-[11px] text-caption">
                Buyers pay in the token you pick, and you receive it.{" "}
                {usingCustom
                  ? "Token details and prices from DexScreener and CoinGecko, refreshed every minute."
                  : `Prices from ${token.pegged ? "CoinGecko" : "DexScreener"}, refreshed every minute.`}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 items-start">
              <Field
                label={pricingType === "AUCTION" ? "Minimum bid" : "Price"}
                htmlFor="price"
                hint={
                  priceUsd != null
                    ? `${formatTokenAmount(priceNumber, token.symbol)} ≈ ${formatUsd(priceUsd)} today.`
                    : selectedToken
                      ? `In ${token.symbol}.`
                      : "Pick a token first."
                }
              >
                <InputAddon suffix={selectedToken ? token.symbol : undefined}>
                  <TextInput
                    id="price"
                    type="number"
                    inputMode="decimal"
                    min={priceDecimals === 0 ? 1 : 10 ** -priceDecimals}
                    step={priceDecimals === 0 ? 1 : 10 ** -priceDecimals}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder={token.pegged ? "1500" : token.custom ? "100" : "4000000"}
                    className="pr-20"
                    disabled={busy}
                  />
                </InputAddon>
              </Field>

              <Field
                label={pricingType === "AUCTION" ? "Bidding ends" : "Offer expires"}
                htmlFor="endDate"
              >
                <div className="space-y-2">
                  <TextInput
                    id="endDate"
                    type="datetime-local"
                    value={endDate}
                    min={toLocalInputValue(new Date(Date.now() + 3_600_000))}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={busy}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {DURATION_PRESETS.map((preset) => (
                      <button
                        key={preset.hours}
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          setEndDate(
                            toLocalInputValue(
                              new Date(Date.now() + preset.hours * 3_600_000),
                            ),
                          )
                        }
                        className="tile px-2.5 py-1 text-[11px] font-medium text-caption hover:text-white transition-colors disabled:opacity-50"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </Field>
            </div>
          </Panel>
        </div>

        <aside className="xl:sticky xl:top-6">
          <ListingPreview
            listing={previewListing}
            rows={previewRows}
            action={
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (
                    !window.confirm(
                      "Clear this listing draft? Your form will reset and this cannot be undone.",
                    )
                  ) {
                    return;
                  }
                  resetForm();
                }}
                className="text-[12px] font-medium text-caption hover:text-white transition-colors disabled:opacity-50"
              >
                Clear
              </button>
            }
          />
        </aside>
      </div>

      <div className="max-lg:sticky max-lg:bottom-[var(--mobile-nav-offset)] max-lg:z-30">
      <Panel className="space-y-3 max-lg:shadow-[0_-12px_32px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-[12px] text-caption min-w-0">
            <Badge variant="accent">On-chain</Badge>
            <span>
              {`Settles on ${CHAIN_LABELS[LISTING_CHAIN_ID]} · ${activeCount}/${MAX_ACTIVE_LISTINGS} open listings used`}
            </span>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={busy || Boolean(disabledReason)}
            aria-describedby={!busy && disabledReason ? "submit-disabled-reason" : undefined}
            className="w-full sm:w-auto sm:min-w-[190px]"
          >
            {busy
              ? "Working…"
              : pendingPersist
                ? "Save to marketplace"
                : pricingType === "AUCTION"
                  ? "Create Listing"
                  : "List at this price"}
          </Button>
        </div>

        {busy && (
          <p className="text-[12px] text-caption">
            {STEP_LABEL[step as keyof typeof STEP_LABEL]}
          </p>
        )}
        {!busy && disabledReason && (
          <p
            id="submit-disabled-reason"
            className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-[12px] leading-snug text-warning"
          >
            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{disabledReason}</span>
          </p>
        )}
        {error && <p className="text-[12px] text-negative">{error}</p>}
      </Panel>
      </div>
    </div>
  );
}

function PricingOption({
  active,
  onClick,
  disabled,
  icon,
  title,
  body,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "rounded-lg border p-3.5 text-left transition-colors disabled:opacity-50",
        active
          ? "border-primary/70 bg-primary/15"
          : "border-line bg-surface-2 hover:border-line-strong",
      )}
    >
      <span
        className={cn(
          "flex items-center gap-2 text-[13px] font-semibold",
          active ? "text-white" : "text-caption",
        )}
      >
        {icon}
        {title}
      </span>
      <span className="mt-1 block text-[11px] text-caption leading-relaxed">{body}</span>
    </button>
  );
}

/**
 * What a pasted address turned out to be: the token's symbol, name and price,
 * and what the listing's price comes to in dollars. Shown before the seller
 * signs, since the token is the listing's for life.
 */
function CustomTokenCard({
  id,
  valid,
  lookup,
  amount,
  onClear,
  disabled,
}: {
  id: string;
  valid: boolean;
  lookup: TokenLookup;
  amount: number | null;
  onClear: () => void;
  disabled?: boolean;
}) {
  if (!valid) {
    return (
      <p id={id} className="text-[12px] text-warning">
        A token address is 0x followed by 40 letters and numbers.
      </p>
    );
  }
  if (lookup.status === "idle" || lookup.status === "loading") {
    return (
      <p id={id} className="flex items-center gap-2 text-[12px] text-caption" aria-live="polite">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        Looking up the token…
      </p>
    );
  }
  if (lookup.status === "error") {
    return (
      <p id={id} className="flex items-start gap-2 text-[12px] text-negative" aria-live="polite">
        <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {lookup.error}
      </p>
    );
  }

  const { token } = lookup;
  const worth = amount != null && token.priceUsd != null ? amount * token.priceUsd : null;
  const explorer = `${robinhood.blockExplorers.default.url}/token/${token.address}`;

  return (
    <Tile id={id} className="space-y-3 px-3.5 py-3" aria-live="polite">
      <div className="flex items-center gap-3">
        <TokenMark
          token={{ symbol: token.symbol, logo: token.logoUrl ?? undefined }}
          size={32}
          className="h-8 w-8"
        />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-white">
            <span className="truncate">{token.symbol}</span>
            {!token.known && <Badge>Custom</Badge>}
          </p>
          <p className="truncate text-[12px] text-caption">{token.name}</p>
        </div>
        <button
          type="button"
          onClick={onClear}
          disabled={disabled}
          className="text-[12px] font-medium text-caption hover:text-white transition-colors disabled:opacity-50"
        >
          Clear
        </button>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[12px]">
        <div className="min-w-0">
          <dt className="text-caption">Price</dt>
          <dd className="numeric truncate font-semibold text-white">
            {token.priceUsd != null ? `1 ${token.symbol} ≈ ${formatUsd(token.priceUsd)}` : "No market price"}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-caption">Your price is worth</dt>
          <dd className="numeric truncate font-semibold text-white">
            {worth != null
              ? `≈ ${formatUsd(worth)}`
              : amount == null
                ? "Set a price below"
                : "—"}
          </dd>
        </div>
      </dl>

      <div className="flex items-center justify-between gap-3 text-[11px] text-caption">
        <span className="numeric truncate font-mono">{shortAddress(token.address)}</span>
        <a
          href={explorer}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1 hover:text-white transition-colors"
        >
          View on Blockscout
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </div>

      {!token.known && (
        <p className="text-[11px] leading-relaxed text-warning">
          Anyone can deploy a token. Check this is the contract you mean — buyers will pay in it
          and you will receive it.
          {token.priceUsd == null &&
            " Neither DexScreener nor CoinGecko prices it, so buyers won't see a dollar value."}
        </p>
      )}
    </Tile>
  );
}
