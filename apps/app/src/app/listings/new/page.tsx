"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { parseUnits } from "viem";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { ArrowLeft, CheckCircle2, Gavel, Info, Tag } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ListingPreview } from "@/components/ListingPreview";
import { useSession } from "@/components/SessionProvider";
import {
  Badge,
  Button,
  Field,
  InputAddon,
  Panel,
  PanelHeader,
  Select,
  TextArea,
  TextInput,
  Tile,
} from "@/components/ui";
import { LISTING_CATEGORIES, type ListingCategory } from "@/lib/listingCategories";
import { formatCount } from "@/lib/api";
import {
  createListing,
  type Listing,
  type NewListingInput,
  type PricingType,
} from "@/lib/marketplace";
import {
  auctionHouseAbi,
  auctionHouseAddress,
  CHAIN_LABELS,
  durationHoursUntil,
  MAX_ACTIVE_LISTINGS,
  paymentTokens,
} from "@/lib/contracts/auctionHouse";
import { robinhood } from "@/lib/chains";
import { cn, shortAddress, walletFallbackAvatar } from "@/lib/utils";
import type { Platform } from "@/components/ui";

const PLATFORMS = [
  { value: "", label: "No specific platform" },
  { value: "TWITTER", label: "X" },
  { value: "YOUTUBE", label: "YouTube" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "TIKTOK", label: "TikTok" },
] as const;

/** Form value → the glyph key the listing card renders. */
const PLATFORM_TO_CARD: Record<string, Platform> = {
  TWITTER: "x",
  YOUTUBE: "youtube",
  INSTAGRAM: "instagram",
  TIKTOK: "tiktok",
};

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

type Step = "form" | "signing" | "confirming" | "publishing" | "done";

const STEP_LABEL: Record<Exclude<Step, "form" | "done">, string> = {
  signing: "Confirm the transaction in your wallet…",
  confirming: "Waiting for the transaction to confirm…",
  publishing: "Publishing to the marketplace…",
};

const LISTING_CHAIN_ID = robinhood.id;

const CATEGORY_VALUES = new Set<string>(LISTING_CATEGORIES.map((c) => c.value));

type ListingDraft = {
  title: string;
  description: string;
  category: ListingCategory;
  pricingType: PricingType;
  price: string;
  endDate: string;
  placement: string;
  platform: string;
  turnaroundDays: string;
  slots: string;
  tokenAddress: string;
};

function defaultDraft(): ListingDraft {
  return {
    title: "",
    description: "",
    category: "SHOUTOUT",
    pricingType: "FIXED",
    price: "",
    endDate: toLocalInputValue(new Date(Date.now() + 7 * 86_400_000)),
    placement: "",
    platform: "",
    turnaroundDays: "",
    slots: "1",
    tokenAddress: "",
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
      category: CATEGORY_VALUES.has(parsed.category ?? "")
        ? (parsed.category as ListingCategory)
        : base.category,
      pricingType: parsed.pricingType === "AUCTION" ? "AUCTION" : "FIXED",
      price: typeof parsed.price === "string" ? parsed.price : base.price,
      endDate: typeof parsed.endDate === "string" ? parsed.endDate : base.endDate,
      placement: typeof parsed.placement === "string" ? parsed.placement : base.placement,
      platform: typeof parsed.platform === "string" ? parsed.platform : base.platform,
      turnaroundDays:
        typeof parsed.turnaroundDays === "string" ? parsed.turnaroundDays : base.turnaroundDays,
      slots: typeof parsed.slots === "string" ? parsed.slots : base.slots,
      tokenAddress: typeof parsed.tokenAddress === "string" ? parsed.tokenAddress : base.tokenAddress,
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
  const { openConnectModal } = useConnectModal();
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: LISTING_CHAIN_ID });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ListingCategory>("SHOUTOUT");
  const [pricingType, setPricingType] = useState<PricingType>("FIXED");
  const [price, setPrice] = useState("");
  const [endDate, setEndDate] = useState(() =>
    toLocalInputValue(new Date(Date.now() + 7 * 86_400_000)),
  );
  const [placement, setPlacement] = useState("");
  const [platform, setPlatform] = useState<string>("");
  const [turnaroundDays, setTurnaroundDays] = useState("");
  const [slots, setSlots] = useState("1");
  const [tokenAddress, setTokenAddress] = useState<string>("");
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);

  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Listing | null>(null);
  /** Set when the chain write landed but the marketplace persist failed. */
  const [pendingPersist, setPendingPersist] = useState<NewListingInput | null>(null);

  const applyDraft = (draft: ListingDraft) => {
    setTitle(draft.title);
    setDescription(draft.description);
    setCategory(draft.category);
    setPricingType(draft.pricingType);
    setPrice(draft.price);
    setEndDate(draft.endDate);
    setPlacement(draft.placement);
    setPlatform(draft.platform);
    setTurnaroundDays(draft.turnaroundDays);
    setSlots(draft.slots);
    setTokenAddress(draft.tokenAddress);
  };

  const resetForm = () => {
    applyDraft(defaultDraft());
    setError(null);
    if (user?.id) dropDraft(user.id);
  };

  const contractAddress = auctionHouseAddress(LISTING_CHAIN_ID);
  const tokens = paymentTokens(LISTING_CHAIN_ID);
  const token = tokens.find((t) => t.address === tokenAddress) ?? tokens[0];
  const chainSupported = chainId === LISTING_CHAIN_ID;
  const categoryMeta = LISTING_CATEGORIES.find((c) => c.value === category)!;

  // The contract refuses a fourth simultaneously open listing, so show the
  // seller where they stand before they spend gas finding out.
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
      category,
      pricingType,
      price,
      endDate,
      placement,
      platform,
      turnaroundDays,
      slots,
      tokenAddress,
    });
  }, [
    user?.id,
    hydratedFor,
    title,
    description,
    category,
    pricingType,
    price,
    endDate,
    placement,
    platform,
    turnaroundDays,
    slots,
    tokenAddress,
  ]);

  const parsedEnd = useMemo(() => (endDate ? new Date(endDate) : null), [endDate]);
  const priceNumber = Number(price);

  const validationError = useMemo(() => {
    if (title.trim().length < 2) return "Give your listing a name.";
    if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
      return pricingType === "AUCTION"
        ? "Set a minimum bid above zero."
        : "Set a price above zero.";
    }
    if (!Number.isInteger(priceNumber)) return "Use a whole number amount.";
    if (!parsedEnd || Number.isNaN(parsedEnd.getTime()))
      return "Pick when the listing ends.";
    if (parsedEnd.getTime() <= Date.now()) return "The end time has to be in the future.";
    return null;
  }, [title, priceNumber, pricingType, parsedEnd]);

  /** Identity shown on the preview card — the profile a listing is created under. */
  const previewCreator = useMemo(() => {
    const social = user?.socials.find((s) => s.displayName || s.username) ?? user?.socials[0];
    const wallet = user?.wallets.find((w) => w.isPrimary) ?? user?.wallets[0];
    const reach = user?.socials.reduce((sum, s) => sum + (s.followerCount ?? 0), 0) ?? 0;

    return {
      id: "preview",
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
    category,
    pricingType,
    price: Number.isFinite(priceNumber) && priceNumber > 0 ? priceNumber : 0,
    currency: token?.symbol ?? "USDG",
    placement: placement.trim() || undefined,
    platform: platform ? PLATFORM_TO_CARD[platform] : undefined,
    turnaroundDays: turnaroundDays ? Number(turnaroundDays) : undefined,
    slotsAvailable: pricingType === "AUCTION" ? 1 : Number(slots) || 1,
    endDate:
      parsedEnd && !Number.isNaN(parsedEnd.getTime()) ? parsedEnd.toISOString() : undefined,
    status: "ACTIVE",
    creator: previewCreator,
  };

  const previewRows = [
    { label: "Category", value: categoryMeta.label },
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
  ];

  const busy = step !== "form" && step !== "done";

  function listingPayload(
    listingId: string,
    hash: `0x${string}`,
  ): NewListingInput {
    return {
      id: listingId,
      title,
      description: description.trim() || undefined,
      category,
      pricingType,
      price: priceNumber,
      currency: token?.symbol ?? "USDG",
      endDate: parsedEnd!.toISOString(),
      placement: placement.trim() || undefined,
      platform: (platform || undefined) as never,
      turnaroundDays: turnaroundDays ? Number(turnaroundDays) : undefined,
      slotsAvailable: slots ? Number(slots) : 1,
      txHash: hash,
      chainId: LISTING_CHAIN_ID,
      contractAddress: contractAddress!,
      tokenAddress: token!.address,
      tokenName: token!.symbol,
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

  async function handleSubmit() {
    if (validationError || !parsedEnd) {
      setError(validationError);
      return;
    }
    if (!contractAddress || !token) {
      setError("AuctionHouse is not configured for Robinhood Chain.");
      return;
    }
    if (!address) {
      openConnectModal?.();
      return;
    }
    setError(null);

    if (pendingPersist) {
      try {
        await persistListing(pendingPersist);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "On-chain listing exists — retry publishing to the marketplace.",
        );
        setStep("form");
      }
      return;
    }

    const listingId = crypto.randomUUID();
    try {
      if (!chainSupported) await switchChainAsync({ chainId: LISTING_CHAIN_ID });

      setStep("signing");
      const amount = parseUnits(String(priceNumber), token.decimals);
      const hours = BigInt(durationHoursUntil(parsedEnd));
      const args = [listingId, token.address, token.symbol, hours, amount] as const;

      const hash = await writeContractAsync({
        address: contractAddress,
        abi: auctionHouseAbi,
        functionName:
          pricingType === "AUCTION" ? "startAuction" : "startFixedPriceListing",
        args,
        chainId: LISTING_CHAIN_ID,
      });

      setStep("confirming");
      if (!publicClient) throw new Error("Could not reach Robinhood Chain.");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status === "reverted") {
        throw new Error("The transaction reverted.");
      }

      const input = listingPayload(listingId, hash);
      try {
        await persistListing(input);
      } catch (err) {
        setPendingPersist(input);
        setError(
          err instanceof Error
            ? `${err.message} The listing is on-chain — retry to save it to the marketplace.`
            : "On-chain listing exists — retry publishing to the marketplace.",
        );
        setStep("form");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the listing.");
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
          subtitle="Sell a piece of your media or your time. Buyers pay in stablecoins, settlement runs through the AuctionHouse contract."
        />
        <Panel className="flex flex-col items-start gap-3">
          <p className="text-sm text-caption">
            Connect and sign in with your wallet to list — it is the account buyers pay out
            to.
          </p>
          <Button onClick={() => openConnectModal?.()}>Connect wallet</Button>
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
                {created.title} is now on the marketplace under{" "}
                {categoryMeta.label.toLowerCase()}.
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
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-1.5 text-[12px] text-caption hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to marketplace
      </Link>

      <PageHeader
        title="Create a listing"
        subtitle="Sell a piece of your media or your time. Set a flat price for instant booking, or open it to bids."
      />

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

            <Field label="Category" hint={categoryMeta.hint}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {LISTING_CATEGORIES.map((c) => {
                  const Icon = c.icon;
                  const active = c.value === category;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      disabled={busy}
                      onClick={() => setCategory(c.value)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-[12px] font-medium transition-colors disabled:opacity-50",
                        active
                          ? "border-primary/70 bg-primary/15 text-white"
                          : "border-line bg-surface-2 text-caption hover:text-white hover:border-line-strong",
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field
                label="Platform"
                htmlFor="platform"
                optional
                hint="Used to file the listing under a platform filter."
              >
                <Select
                  id="platform"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  disabled={busy}
                >
                  {PLATFORMS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Placement"
                htmlFor="placement"
                optional
                hint="Short label shown on the card, e.g. “Pinned post”."
              >
                <TextInput
                  id="placement"
                  value={placement}
                  onChange={(e) => setPlacement(e.target.value)}
                  placeholder={categoryMeta.label}
                  maxLength={80}
                  disabled={busy}
                />
              </Field>
            </div>
          </Panel>

          <Panel className="space-y-5">
            <PanelHeader label="How it sells" />

            <div className="grid sm:grid-cols-2 gap-2">
              <PricingOption
                active={pricingType === "FIXED"}
                onClick={() => setPricingType("FIXED")}
                disabled={busy}
                icon={<Tag className="w-4 h-4" />}
                title="Flat price"
                body="Buyers book instantly at your price. First to pay wins the slot."
              />
              <PricingOption
                active={pricingType === "AUCTION"}
                onClick={() => setPricingType("AUCTION")}
                disabled={busy}
                icon={<Gavel className="w-4 h-4" />}
                title="Auction"
                body="Buyers bid above your minimum. Highest bid at close takes it."
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field
                label={pricingType === "AUCTION" ? "Minimum bid" : "Price"}
                htmlFor="price"
                hint={`Whole ${token?.symbol ?? "USDG"} — no decimals.`}
              >
                <InputAddon prefix="$" suffix={token?.symbol ?? "USDG"}>
                  <TextInput
                    id="price"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="1500"
                    className="pl-7 pr-16"
                    disabled={busy}
                  />
                </InputAddon>
              </Field>

              {tokens.length > 1 && (
                <Field
                  label="Paid in"
                  htmlFor="token"
                  hint="The token the contract settles in."
                >
                  <Select
                    id="token"
                    value={token?.address ?? ""}
                    onChange={(e) => setTokenAddress(e.target.value)}
                    disabled={busy}
                  >
                    {tokens.map((t) => (
                      <option key={t.address} value={t.address}>
                        {t.symbol}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              {pricingType === "FIXED" && (
                <Field
                  label="Slots"
                  htmlFor="slots"
                  optional
                  hint="How many buyers can book this."
                >
                  <TextInput
                    id="slots"
                    type="number"
                    min={1}
                    step={1}
                    value={slots}
                    onChange={(e) => setSlots(e.target.value)}
                    disabled={busy}
                  />
                </Field>
              )}

              <Field
                label="Turnaround"
                htmlFor="turnaround"
                optional
                hint="Days from booking to delivery."
              >
                <TextInput
                  id="turnaround"
                  type="number"
                  min={1}
                  step={1}
                  value={turnaroundDays}
                  onChange={(e) => setTurnaroundDays(e.target.value)}
                  placeholder="7"
                  disabled={busy}
                />
              </Field>
            </div>

            <Field
              label={pricingType === "AUCTION" ? "Bidding ends" : "Offer expires"}
              htmlFor="endDate"
              hint="Rounded up to a whole hour on-chain — it never closes early."
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

      <Panel className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-[12px] text-caption">
            <Badge variant="accent">On-chain</Badge>
            <span>
              Settles on {CHAIN_LABELS[LISTING_CHAIN_ID]} · {activeCount}/
              {MAX_ACTIVE_LISTINGS} open listings used
            </span>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={busy || atListingCap || Boolean(validationError) || !token}
            className="min-w-[190px]"
          >
            {busy
              ? "Working…"
              : pendingPersist
                ? "Save to marketplace"
                : pricingType === "AUCTION"
                  ? "Open for bids"
                  : "List at this price"}
          </Button>
        </div>

        {busy && (
          <p className="text-[12px] text-caption">
            {STEP_LABEL[step as keyof typeof STEP_LABEL]}
          </p>
        )}
        {!busy && validationError && (
          <p className="text-[12px] text-caption">{validationError}</p>
        )}
        {error && <p className="text-[12px] text-negative">{error}</p>}
      </Panel>
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
