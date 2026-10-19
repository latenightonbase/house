"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, BadgeCheck, ImageIcon, Loader2, Search, X } from "lucide-react";
import { PosterThumb } from "@/components/listing/ListingPoster";
import { money, priceLine } from "@/components/home/listingParts";
import { RatingBadge } from "@/components/reviews/RatingBadge";
import { profileHref } from "@/components/UserLink";
import { Avatar } from "@/components/ui";
import type { Listing } from "@/lib/marketplace";
import {
  EMPTY_RESULTS,
  OPEN_SEARCH_EVENT,
  searchSite,
  type ProfileResult,
  type SearchResults,
} from "@/lib/search";
import { cn } from "@/lib/utils";

/** Long enough that a typed word is one request, short enough to feel live. */
const DEBOUNCE_MS = 200;

type Option =
  | { kind: "profile"; key: string; href: string; profile: ProfileResult }
  | { kind: "listing"; key: string; href: string; listing: Listing }
  | { kind: "all"; key: string; href: string; total: number };

/**
 * The site-wide search. On a desktop it is a bar pinned to the top of every
 * page; on a phone the header's search button opens it. Focusing it blurs the
 * page behind and drops the results beneath the box: people by username, and
 * live listings by title, write-up or seller.
 *
 * It is a combobox — the caret stays in the box while the arrow keys move
 * through the results — and opens from anywhere with ⌘K, Ctrl+K or "/".
 */
export function GlobalSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);

  const close = useCallback(() => {
    setOpen(false);
    inputRef.current?.blur();
  }, []);

  // Focused synchronously: a phone only raises its keyboard for focus that
  // happens inside the tap itself, so the box is never `display: none` (see
  // the sheet's classes below) and this runs straight from the click.
  const show = useCallback(() => {
    inputRef.current?.focus();
    setOpen(true);
  }, []);

  // A result was followed, or the page changed some other way.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onOpen = () => show();
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.isContentEditable ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT";
      if ((event.key === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !typing)) {
        event.preventDefault();
        show();
      }
    };
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, [show]);

  // The page stays put behind the blur rather than scrolling under the results.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(EMPTY_RESULTS);
      setLoading(false);
      setFailed(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchSite(q, controller.signal)
        .then((next) => {
          setResults(next);
          setFailed(false);
          setActive(0);
        })
        .catch((err: unknown) => {
          if ((err as Error)?.name !== "AbortError") setFailed(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const q = query.trim();
  const options = useMemo<Option[]>(() => {
    const list: Option[] = [
      ...results.profiles
        .filter((profile) => profile.handle)
        .map((profile) => ({
          kind: "profile" as const,
          key: `p:${profile.handle}`,
          href: profileHref(profile.handle!),
          profile,
        })),
      ...results.listings.map((listing) => ({
        kind: "listing" as const,
        key: `l:${listing.id}`,
        href: `/listings/${listing.id}`,
        listing,
      })),
    ];
    if (results.totalListings > results.listings.length) {
      list.push({
        kind: "all",
        key: "all",
        href: `/marketplace?q=${encodeURIComponent(q)}`,
        total: results.totalListings,
      });
    }
    return list;
  }, [results, q]);

  function go(option: Option | undefined) {
    if (!option) return;
    router.push(option.href);
    close();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (options.length ? (i + 1) % options.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (options.length ? (i - 1 + options.length) % options.length : 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(options[active]);
    }
  }

  const optionId = (index: number) => `${listId}-option-${index}`;
  const profiles = options.filter((o) => o.kind === "profile");
  const listings = options.filter((o) => o.kind !== "profile");
  const showPanel = open && q.length > 0;

  return (
    <>
      {open && (
        <div
          aria-hidden="true"
          onClick={close}
          className="fixed inset-0 z-[60] bg-background/55 backdrop-blur-md animate-in fade-in-0 duration-150"
        />
      )}

      <div
        className={cn(
          // Desktop: a bar pinned across the top of the content column.
          "lg:sticky lg:top-0 lg:block lg:border-b lg:border-line lg:bg-background/80 lg:px-8 lg:py-3 lg:backdrop-blur-md",
          // Phone: a sheet over the header, invisible and inert until opened —
          // kept rendered so the header's button can focus it within the tap.
          "max-lg:fixed max-lg:inset-x-0 max-lg:top-0 max-lg:px-3 max-lg:pb-3 max-lg:pt-[calc(var(--safe-top)+0.625rem)] max-lg:transition-[opacity,translate] max-lg:duration-150",
          !open && "max-lg:pointer-events-none max-lg:-translate-y-2 max-lg:opacity-0",
          open ? "z-[70] lg:border-transparent lg:bg-transparent" : "z-40",
        )}
      >
        <div className="relative mx-auto flex max-w-2xl items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-caption"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              type="text"
              inputMode="search"
              enterKeyHint="search"
              role="combobox"
              aria-label="Search listings and people"
              aria-expanded={showPanel}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={showPanel && options.length ? optionId(active) : undefined}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setOpen(true)}
              onKeyDown={onKeyDown}
              placeholder="Search listings and people"
              autoComplete="off"
              spellCheck={false}
              className={cn(
                "h-11 w-full rounded-xl border bg-surface-2 pl-10 pr-20 text-base text-foreground outline-none transition-colors placeholder:text-caption sm:text-sm",
                open
                  ? "border-primary/60 ring-2 ring-primary/25 shadow-2xl shadow-black/50"
                  : "border-line hover:border-line-strong",
              )}
            />
            <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
              {loading && <Loader2 className="h-4 w-4 animate-spin text-caption" aria-hidden="true" />}
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                  className="flex h-6 w-6 items-center justify-center rounded-md text-caption transition-colors hover:text-white"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              ) : (
                <kbd className="hidden rounded-md border border-line px-1.5 py-0.5 font-sans text-[10px] text-caption lg:inline">
                  ⌘K
                </kbd>
              )}
            </span>
          </div>
          {open && (
            <button
              type="button"
              onClick={close}
              className="shrink-0 px-1 text-[13px] font-medium text-caption transition-colors hover:text-white lg:hidden"
            >
              Cancel
            </button>
          )}

          {open && (
            <div
              className={cn(
                "absolute inset-x-0 top-full mt-2 overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-2xl shadow-black/60",
                "max-h-[min(70dvh,34rem)] overflow-y-auto overscroll-contain",
              )}
            >
              {!q ? (
                <p className="px-4 py-5 text-[13px] leading-relaxed text-caption">
                  Find listings by title, write-up or seller, and people by username.
                </p>
              ) : failed ? (
                <p className="px-4 py-5 text-[13px] text-negative">Search is unavailable right now.</p>
              ) : options.length === 0 ? (
                <p className="px-4 py-5 text-[13px] text-caption">
                  {loading ? "Searching…" : <>Nothing matches “{q}”.</>}
                </p>
              ) : (
                <ul id={listId} role="listbox" aria-label="Search results" className="py-1.5">
                  {profiles.length > 0 && <GroupLabel>People</GroupLabel>}
                  {profiles.map((option) => {
                    const index = options.indexOf(option);
                    return (
                      <ResultRow
                        key={option.key}
                        id={optionId(index)}
                        option={option}
                        active={index === active}
                        onHover={() => setActive(index)}
                        onPick={close}
                      />
                    );
                  })}
                  {listings.length > 0 && <GroupLabel>Listings</GroupLabel>}
                  {listings.map((option) => {
                    const index = options.indexOf(option);
                    return (
                      <ResultRow
                        key={option.key}
                        id={optionId(index)}
                        option={option}
                        active={index === active}
                        onHover={() => setActive(index)}
                        onPick={close}
                      />
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <li role="presentation" className="panel-label px-4 pb-1 pt-2.5">
      {children}
    </li>
  );
}

function ResultRow({
  id,
  option,
  active,
  onHover,
  onPick,
}: {
  id: string;
  option: Option;
  active: boolean;
  onHover: () => void;
  onPick: () => void;
}) {
  return (
    <li id={id} role="option" aria-selected={active}>
      {/* A real link, so a middle-click or long-press opens it in a new tab. */}
      <Link
        href={option.href}
        tabIndex={-1}
        onMouseMove={onHover}
        onClick={onPick}
        className={cn(
          "mx-1.5 flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors",
          active ? "bg-primary/15" : "hover:bg-white/[0.03]",
        )}
      >
        {option.kind === "profile" && <ProfileOption profile={option.profile} />}
        {option.kind === "listing" && <ListingOption listing={option.listing} />}
        {option.kind === "all" && (
          <span className="flex min-w-0 flex-1 items-center gap-2 py-1 text-[13px] font-semibold text-primary-light">
            See all {option.total} matching listings
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        )}
      </Link>
    </li>
  );
}

function ProfileOption({ profile }: { profile: ProfileResult }) {
  return (
    <>
      <Avatar
        src={profile.avatarUrl}
        alt=""
        fallbackSeed={profile.wallet ?? profile.handle ?? profile.name}
        fallback={profile.name.slice(0, 2).toUpperCase()}
        size={32}
      />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1.5 text-[13px] font-semibold text-white">
          <span className="truncate">{profile.name}</span>
          {profile.verified && (
            <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary-bright" aria-label="Verified" />
          )}
          <RatingBadge rating={profile.rating} size="xs" />
        </span>
        <span className="block truncate text-[11px] text-caption">Public profile</span>
      </span>
    </>
  );
}

function ListingOption({ listing }: { listing: Listing }) {
  const price = priceLine(listing);
  return (
    <>
      <PosterThumb
        src={listing.posterUrl}
        alt=""
        size={36}
        placeholder={<ImageIcon className="h-4 w-4 opacity-60" />}
        fallbackSeed={listing.id}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold text-white">{listing.title}</span>
        <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-caption">
          <span className="truncate">{listing.creator.displayName}</span>
          {listing.creator.verified && (
            <BadgeCheck className="h-3 w-3 shrink-0 text-primary" aria-label="Verified" />
          )}
          <RatingBadge rating={listing.creator.rating} size="xs" />
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="numeric block text-[13px] font-bold text-white">
          {money(listing, price.amount)}
        </span>
        <span className="block text-[10px] text-caption">
          {listing.pricingType === "AUCTION" ? "Auction" : "Flat fee"}
        </span>
      </span>
    </>
  );
}
