"use client";

import { useState } from "react";
import { Crown, ExternalLink, Globe } from "lucide-react";
import { SocialIcon } from "@/components/nav/SocialIcons";
import { billboardPlaceholder } from "@/lib/brandMark";
import type { Spotlight } from "@/lib/dailyAuction";
import { cn } from "@/lib/utils";

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
 * The billboard: the project that won yesterday's auction, live for its 24
 * hours. Every field below the name is optional — a bidder only has to supply
 * a project name, so this degrades to name + winning bid.
 */
export function TodaysAttention({ spotlight }: { spotlight: Spotlight }) {
  const [imageFailed, setImageFailed] = useState(false);
  const { lead, accent } = splitName(spotlight.name);
  const artwork =
    !imageFailed && spotlight.imageUrl ? spotlight.imageUrl : billboardPlaceholder(spotlight.name);

  return (
    <section className="panel-glow relative overflow-hidden">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* Copy */}
        <div className="relative z-10 p-6 sm:p-8 lg:py-10 flex flex-col">
          <p className="flex items-center gap-2 eyebrow text-primary-bright">
            <Crown className="w-[15px] h-[15px]" aria-hidden="true" />
            Today&apos;s Attention
          </p>

          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-caption">
            24-hour billboard
            <span className="mx-2 text-line-strong">•</span>
            {billboardDate(spotlight.liveSince)}
          </p>

          <h1 className="mt-3 display text-[clamp(2.25rem,6vw,4.25rem)] uppercase">
            <span className="text-white">{lead}</span>
            {accent && <span className="text-primary-bright"> {accent}</span>}
          </h1>

          {spotlight.description && (
            <p className="mt-4 text-[15px] leading-relaxed text-caption max-w-md">
              {spotlight.description}
            </p>
          )}

          {(spotlight.websiteUrl || spotlight.twitterUrl || spotlight.youtubeUrl) && (
            <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-3">
              {spotlight.websiteUrl && (
                <a
                  href={href(spotlight.websiteUrl)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-2 text-[13px] text-white/90 hover:text-primary-light transition-colors"
                >
                  <Globe className="w-4 h-4 text-caption" aria-hidden="true" />
                  {hostname(spotlight.websiteUrl)}
                </a>
              )}
              {spotlight.twitterUrl && (
                <a
                  href={href(spotlight.twitterUrl)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-2 text-[13px] text-white/90 hover:text-primary-light transition-colors"
                >
                  <SocialIcon id="x" className="w-3.5 h-3.5 text-caption" />
                  {twitterHandle(spotlight.twitterUrl)}
                </a>
              )}
              {spotlight.youtubeUrl && (
                <a
                  href={href(spotlight.youtubeUrl)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-2 text-[13px] text-white/90 hover:text-primary-light transition-colors"
                >
                  <SocialIcon id="youtube" className="w-4 h-4 text-caption" />
                  YouTube
                </a>
              )}
            </div>
          )}

          {spotlight.websiteUrl && (
            <a
              href={href(spotlight.websiteUrl)}
              target="_blank"
              rel="noreferrer noopener"
              className="gradient-button mt-8 inline-flex items-center justify-center gap-2.5 self-start h-12 px-7 rounded-lg text-white eyebrow"
            >
              Visit project
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </a>
          )}
        </div>

        {/* Artwork */}
        <div className="relative min-h-[220px] sm:min-h-[300px] lg:min-h-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={artwork}
            alt={spotlight.name}
            onError={() => setImageFailed(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Feathers the artwork into the copy column instead of hard-cropping. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-surface via-surface/40 to-transparent lg:from-surface lg:via-surface/20"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-surface/80 via-transparent to-transparent"
          />

          <div className="absolute bottom-4 right-4 left-4 sm:left-auto flex justify-end">
            <p
              className={cn(
                "inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-4 py-2.5",
                "bg-background/80 backdrop-blur-sm border border-primary/30",
              )}
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-primary-light">
                Winner of the {shortDate(spotlight.liveSince)} attention auction
              </span>
              <span className="text-[15px] font-bold text-white numeric">
                ${spotlight.winningBid.toLocaleString()}
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Shown before the first auction settles, so the page never renders headless. */
export function TodaysAttentionEmpty() {
  return (
    <section className="panel-glow p-8 sm:p-12 text-center">
      <p className="flex items-center justify-center gap-2 eyebrow text-primary-bright">
        <Crown className="w-[15px] h-[15px]" aria-hidden="true" />
        Today&apos;s Attention
      </p>
      <h1 className="mt-4 display text-[clamp(1.75rem,5vw,3rem)] uppercase text-white">
        The billboard is <span className="text-primary-bright">open</span>
      </h1>
      <p className="mt-4 text-[15px] text-caption max-w-md mx-auto leading-relaxed">
        No auction has settled yet. Win the live auction below and your project takes this space
        for a full 24 hours.
      </p>
    </section>
  );
}
