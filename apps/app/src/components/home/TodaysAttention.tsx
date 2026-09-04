"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { Crown, ExternalLink, Globe } from "lucide-react";
import { SocialIcon } from "@/components/nav/SocialIcons";
import { billboardPlaceholder } from "@/lib/brandMark";
import type { Spotlight } from "@/lib/dailyAuction";
import { isUnoptimizedSrc } from "@/lib/imageSrc";

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
 * The billboard: yesterday's winner, live for 24 hours. Built around a 1:1
 * poster in a gold frame — square on every breakpoint, so the artwork is never
 * cropped and reads as the hero on phones as well as the side of a 2-up on PC.
 */
export function TodaysAttention({ spotlight }: { spotlight: Spotlight }) {
  const [imageFailed, setImageFailed] = useState(false);
  const { lead, accent } = splitName(spotlight.name);
  const artwork =
    !imageFailed && spotlight.imageUrl ? spotlight.imageUrl : billboardPlaceholder(spotlight.name);
  const artworkSizes =
    "(min-width: 1536px) 26rem, (min-width: 1280px) 20rem, (min-width: 640px) 16rem, 100vw";
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
    <section className="billboard relative overflow-hidden rounded-2xl sm:rounded-[1.5rem]">
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

      <div className="relative grid items-center gap-5 p-4 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] sm:gap-6 sm:p-5 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] lg:gap-8 lg:p-6 xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] 2xl:gap-10">
        {/* 1:1 poster — the exact ratio creators upload at, so nothing is cropped. */}
        <div className="billboard-frame relative aspect-square w-full overflow-hidden rounded-xl sm:rounded-2xl">
          <Image
            src={artwork}
            alt={spotlight.name}
            fill
            sizes={artworkSizes}
            unoptimized={isUnoptimizedSrc(artwork)}
            onError={() => setImageFailed(true)}
            className="object-cover"
            priority
          />
          <span aria-hidden="true" className="billboard-scrim absolute inset-0" />
          <p className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full border border-gold/45 bg-background/80 px-2.5 py-1 font-semibold uppercase tracking-[0.14em] text-[9px] text-gold-light backdrop-blur-sm xl:top-3 xl:left-3 xl:gap-2 xl:px-3 xl:py-1.5 xl:text-[11px] xl:tracking-[0.16em]">
            <Crown className="w-3 h-3 xl:w-3.5 xl:h-3.5" aria-hidden="true" />
            Today&apos;s Attention
          </p>
        </div>

        <div className="flex flex-col">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-caption">
            <span>24-hour billboard</span>
            <span className="text-gold/60" aria-hidden="true">
              •
            </span>
            <span>{billboardDate(spotlight.liveSince)}</span>
          </p>

          <h1 className="mt-2.5 display uppercase text-[clamp(2.25rem,11vw,3.25rem)] lg:text-[clamp(2.5rem,3.4vw,4rem)] break-words">
            <span className="text-white">{lead}</span>
            {accent && <span className="text-primary-bright"> {accent}</span>}
          </h1>

          {spotlight.description && (
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/75">
              {spotlight.description}
            </p>
          )}

          {/* The prize line — the one place gold carries meaning rather than trim. */}
          <p className="mt-5 inline-flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-gold/35 bg-gold/[0.06] px-4 py-3 sm:w-auto sm:self-start">
            <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-gold-light">
              Winner of the {shortDate(spotlight.liveSince)} attention auction
            </span>
            <span className="numeric text-[19px] font-bold text-white">
              ${spotlight.winningBid.toLocaleString()}
            </span>
          </p>

          {links.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {links.map((link) => (
                <a
                  key={link.key}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-white/[0.03] px-3.5 py-2 text-[13px] text-white/85 transition-colors hover:border-gold/45 hover:text-white"
                >
                  {link.icon}
                  {link.label}
                </a>
              ))}
            </div>
          )}

          {spotlight.websiteUrl && (
            <a
              href={href(spotlight.websiteUrl)}
              target="_blank"
              rel="noreferrer noopener"
              className="gradient-button mt-5 inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-lg px-7 text-white eyebrow sm:w-auto sm:self-start"
            >
              Visit project
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

/** Shown before the first auction settles, so the page never renders headless. */
export function TodaysAttentionEmpty() {
  return (
    <section className="billboard relative overflow-hidden rounded-2xl px-5 py-10 text-center sm:rounded-[1.5rem] sm:px-12 sm:py-14">
      <div aria-hidden="true" className="billboard-sheen pointer-events-none absolute inset-0" />
      <p className="relative inline-flex items-center gap-2 rounded-full border border-gold/45 bg-background/70 px-3.5 py-1.5 eyebrow text-gold-light">
        <Crown className="w-[15px] h-[15px]" aria-hidden="true" />
        Today&apos;s Attention
      </p>
      <h1 className="relative mt-5 display text-[clamp(1.85rem,6vw,3rem)] uppercase text-white">
        The billboard is <span className="text-primary-bright">open</span>
      </h1>
      <p className="relative mt-4 max-w-md mx-auto text-[15px] leading-relaxed text-caption">
        No auction has settled yet. Win the live auction below and your project takes this space
        for a full 24 hours.
      </p>
    </section>
  );
}
