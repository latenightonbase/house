"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { Crown, ExternalLink, Globe } from "lucide-react";
import { SocialIcon } from "@/components/nav/SocialIcons";
import { billboardPlaceholder } from "@/lib/brandMark";
import type { Spotlight } from "@/lib/dailyAuction";
import { isUnoptimizedSrc } from "@/lib/imageSrc";
import { useCountdown } from "@/lib/useCountdown";
import { countdownLabel } from "./listingParts";

/** "AUG 31, 2026" — the billboard's date line. */
function billboardDate(iso: string | null) {
  const date = iso ? new Date(iso) : new Date();
  return date
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    .toUpperCase();
}

/** "AUG 31" — the winner badge, where the year would crowd the line. */
function shortDate(iso: string | null) {
  const date = iso ? new Date(iso) : new Date();
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
}

/**
 * Splits a project name so the last word can take the accent colour, the way
 * "PROJECT XYZ" reads in the reference. A single-word name stays all white.
 */
function splitName(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return { lead: name, accent: "" };
  return { lead: words.slice(0, -1).join(" "), accent: words[words.length - 1] };
}

/**
 * The display face is set in viewport units, so a ticker-style name — one long
 * unbreakable run — would break mid-word on a phone once the column is properly
 * constrained. Step the size down by the longest run instead, so the name always
 * lands on a line of its own rather than being sliced in half.
 */
function nameSize(name: string) {
  const longest = name
    .trim()
    .split(/\s+/)
    .reduce((max, word) => Math.max(max, word.length), 0);
  if (longest <= 9) return "text-[clamp(2rem,10vw,2.75rem)] lg:text-[clamp(2rem,2.6vw,3rem)]";
  if (longest <= 13) return "text-[clamp(1.75rem,8vw,2.4rem)] lg:text-[clamp(1.75rem,2.2vw,2.5rem)]";
  if (longest <= 20) return "text-[clamp(1.35rem,6vw,1.9rem)] lg:text-[clamp(1.4rem,1.7vw,2rem)]";
  return "text-[clamp(1.1rem,4.5vw,1.5rem)] lg:text-[clamp(1.15rem,1.3vw,1.6rem)]";
}

function hostname(url: string) {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** "@handle" from an X profile URL, falling back to the raw value. */
function twitterHandle(url: string) {
  const match = url.match(/(?:twitter\.com|x\.com)\/@?([A-Za-z0-9_]{1,15})/i);
  if (match) return `@${match[1]}`;
  return url.startsWith("@") ? url : `@${url.replace(/^https?:\/\//, "")}`;
}

function href(url: string) {
  return url.startsWith("http") ? url : `https://${url}`;
}

/**
 * The billboard: yesterday's winner, live for 24 hours. Built around a poster in
 * a gold frame — square on every breakpoint, whatever ratio the winner uploaded,
 * so it reads as the hero on phones as well as the side of a 2-up on PC.
 */
export function TodaysAttention({ spotlight }: { spotlight: Spotlight }) {
  const [imageFailed, setImageFailed] = useState(false);
  const runRemaining = useCountdown(spotlight.liveUntil);
  const { lead, accent } = splitName(spotlight.name);
  const artwork =
    !imageFailed && spotlight.imageUrl ? spotlight.imageUrl : billboardPlaceholder(spotlight.name);
  const artworkSizes = "(min-width: 1536px) 19rem, (min-width: 1280px) 17rem, (min-width: 640px) 15rem, 100vw";
  const links = [
    spotlight.websiteUrl && {
      key: "web",
      href: href(spotlight.websiteUrl),
      icon: <Globe className="w-4 h-4 text-gold/70" aria-hidden="true" />,
      label: hostname(spotlight.websiteUrl),
    },
    spotlight.twitterUrl && {
      key: "x",
      href: href(spotlight.twitterUrl),
      icon: <SocialIcon id="x" className="w-3.5 h-3.5 text-gold/70" />,
      label: twitterHandle(spotlight.twitterUrl),
    },
    spotlight.youtubeUrl && {
      key: "youtube",
      href: href(spotlight.youtubeUrl),
      icon: <SocialIcon id="youtube" className="w-4 h-4 text-gold/70" />,
      label: "YouTube",
    },
  ].filter(Boolean) as { key: string; href: string; icon: ReactNode; label: string }[];

  return (
    <section className="billboard relative flex overflow-hidden rounded-2xl">
      {/* The poster again, blown up and blurred, so the card is lit by the artwork
          itself. Scaled past the edges because a blur of this radius would
          otherwise fade to transparent along them. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <Image
          src={artwork}
          alt=""
          fill
          sizes={artworkSizes}
          unoptimized={isUnoptimizedSrc(artwork)}
          className="scale-125 object-cover blur-2xl"
        />
        <span className="billboard-veil absolute inset-0" />
      </div>

      <div aria-hidden="true" className="billboard-sheen pointer-events-none absolute inset-0" />

      <div className="relative flex w-full min-w-0 flex-col gap-4 p-4 sm:flex-row sm:gap-5 sm:p-5">
        {/* The poster stays square at every width — stretching it to the panel's
            height would turn a 1:1 upload into a narrow banner. Uploads are not
            always 1:1 either, so the artwork is contained rather than cropped and
            the strips it leaves over are filled with a blurred copy of itself. */}
        <div className="billboard-frame relative aspect-square w-full shrink-0 self-center overflow-hidden rounded-xl sm:w-[13rem] lg:w-[15rem] xl:w-[17rem] 2xl:w-[19rem]">
          <Image
            src={artwork}
            alt=""
            aria-hidden="true"
            fill
            sizes={artworkSizes}
            unoptimized={isUnoptimizedSrc(artwork)}
            className="scale-110 object-cover blur-2xl"
          />
          {/* Holds the matting back so the artwork itself stays the brightest thing
              in the frame. Under the poster, so only the leftover strips darken. */}
          <span aria-hidden="true" className="absolute inset-0 bg-[#08040f]/55" />
          <Image
            src={artwork}
            alt={spotlight.name}
            fill
            sizes={artworkSizes}
            unoptimized={isUnoptimizedSrc(artwork)}
            onError={() => setImageFailed(true)}
            className="object-contain"
            priority
          />
          <span aria-hidden="true" className="billboard-scrim absolute inset-0" />
          <p className="absolute top-2 left-2 inline-flex items-center gap-1.5 rounded-full border border-gold/45 bg-background/80 px-2.5 py-1 font-semibold uppercase tracking-[0.13em] text-[9px] text-gold-light backdrop-blur-sm">
            <Crown className="w-3 h-3" aria-hidden="true" />
            Today&apos;s Attention
          </p>
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-caption">
            <span>24-hour billboard</span>
            <span className="text-gold/60" aria-hidden="true">
              •
            </span>
            <span>{billboardDate(spotlight.liveSince)}</span>
          </p>

          <h1 className={`mt-2 display uppercase [overflow-wrap:anywhere] ${nameSize(spotlight.name)}`}>
            <span className="text-white">{lead}</span>
            {accent && <span className="text-primary-bright"> {accent}</span>}
          </h1>

          {spotlight.description && (
            <p className="mt-2.5 line-clamp-3 max-w-xl text-[13px] leading-relaxed text-white/75 [overflow-wrap:anywhere]">
              {spotlight.description}
            </p>
          )}

          {/* The prize line — the one place gold carries meaning rather than trim.
              The run clock sits beside it: the billboard is a 24-hour tenancy, so
              how much of it is left is part of what the winner bought. */}
          <div className="mt-4 flex flex-wrap items-stretch gap-2">
            <p className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-xl border border-gold/35 bg-gold/[0.06] px-3.5 py-2.5">
              <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-gold-light">
                Winner of the {shortDate(spotlight.liveSince)} attention auction
              </span>
              <span className="numeric text-[17px] font-bold text-white">
                ${spotlight.winningBid.toLocaleString()}
              </span>
            </p>
            {runRemaining && !runRemaining.ended && (
              <p className="inline-flex items-center gap-2 rounded-xl border border-line-strong bg-white/[0.03] px-3.5 py-2.5">
                <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-caption">
                  On the billboard for
                </span>
                <span className="numeric text-[15px] font-bold text-white">
                  {countdownLabel(runRemaining)}
                </span>
              </p>
            )}
          </div>

          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            {spotlight.websiteUrl && (
              <a
                href={href(spotlight.websiteUrl)}
                target="_blank"
                rel="noreferrer noopener"
                className="gradient-button inline-flex h-10 items-center justify-center gap-2 rounded-lg px-5 text-[11px] uppercase tracking-[0.13em] font-bold text-white max-sm:w-full"
              >
                Visit project
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            )}
            {links.map((link) => (
              <a
                key={link.key}
                href={link.href}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex h-10 max-w-full items-center gap-2 rounded-lg border border-line-strong bg-white/[0.03] px-3.5 text-[12px] text-white/85 transition-colors hover:border-gold/45 hover:text-white"
              >
                <span className="shrink-0">{link.icon}</span>
                <span className="truncate">{link.label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Shown before the first auction settles, so the page never renders headless. */
export function TodaysAttentionEmpty() {
  return (
    <section className="billboard relative flex min-h-[15rem] flex-col items-center justify-center overflow-hidden rounded-2xl px-5 py-9 text-center sm:px-10">
      <div aria-hidden="true" className="billboard-sheen pointer-events-none absolute inset-0" />
      <p className="relative inline-flex items-center gap-2 rounded-full border border-gold/45 bg-background/70 px-3.5 py-1.5 eyebrow text-gold-light">
        <Crown className="w-[15px] h-[15px]" aria-hidden="true" />
        Today&apos;s Attention
      </p>
      <h1 className="relative mt-4 display text-[clamp(1.6rem,4.5vw,2.5rem)] uppercase text-white">
        The billboard is <span className="text-primary-bright">open</span>
      </h1>
      <p className="relative mt-3 max-w-md text-[14px] leading-relaxed text-caption">
        No auction has settled yet. Win the live auction beside this and your project takes the
        space for a full 24 hours.
      </p>
    </section>
  );
}
