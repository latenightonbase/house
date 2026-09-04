"use client";

import { useState } from "react";
import Image from "next/image";
import { ExternalLink, Globe, Trophy, Users } from "lucide-react";
import { BrandAvatar, Card } from "@/components/ui";
import { SocialIcon } from "@/components/nav/SocialIcons";
import { billboardPlaceholder } from "@/lib/brandMark";
import { isUnoptimizedSrc } from "@/lib/imageSrc";
import type { ListingBidder } from "@/lib/marketplace";
import { shortAddress, walletFallbackAvatar } from "@/lib/utils";

function href(url: string) {
  return url.startsWith("http") ? url : `https://${url}`;
}

function hostname(url: string) {
  try {
    return new URL(href(url)).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function twitterHandle(url: string) {
  const match = url.match(/(?:twitter\.com|x\.com)\/@?([A-Za-z0-9_]{1,15})/i);
  if (match) return `@${match[1]}`;
  return url.startsWith("@") ? url : `@${url.replace(/^https?:\/\//, "")}`;
}

function BidderCard({ bidder }: { bidder: ListingBidder }) {
  const [artFailed, setArtFailed] = useState(false);
  const project = bidder.project;
  const projectName = project?.name ?? bidder.name;
  const artwork =
    !artFailed && project?.imageUrl ? project.imageUrl : billboardPlaceholder(projectName);
  const bidderAvatar = bidder.avatarUrl || walletFallbackAvatar(bidder.wallet);
  const hasLinks = Boolean(project?.websiteUrl || project?.twitterUrl || project?.youtubeUrl);

  return (
    <article className="card overflow-hidden">
      <div className="grid sm:grid-cols-[10rem_minmax(0,1fr)]">
        <div className="relative aspect-[16/10] sm:aspect-auto sm:min-h-[11rem] bg-surface-2">
          <Image
            src={artwork}
            alt=""
            fill
            sizes="(min-width: 640px) 160px, 100vw"
            unoptimized={isUnoptimizedSrc(artwork)}
            onError={() => setArtFailed(true)}
            className="object-cover"
          />
          {bidder.leading && (
            <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-md bg-background/80 backdrop-blur-sm border border-warning/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-warning">
              <Trophy className="w-3 h-3" aria-hidden="true" />
              Leading
            </span>
          )}
        </div>

        <div className="p-4 sm:p-5 flex flex-col min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-[16px] font-bold text-white truncate">{projectName}</h3>
              {project?.description ? (
                <p className="mt-1.5 text-[13px] leading-relaxed text-caption line-clamp-3">
                  {project.description}
                </p>
              ) : null}
            </div>
            <div className="text-right shrink-0">
              <p className="panel-label">Bid</p>
              <p className="mt-0.5 text-[18px] font-bold text-primary-bright numeric">
                ${bidder.amount.toLocaleString()}
              </p>
            </div>
          </div>

          {hasLinks && project ? (
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
              {project.websiteUrl && (
                <a
                  href={href(project.websiteUrl)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 text-[12px] text-white/85 hover:text-primary-light"
                >
                  <Globe className="w-3.5 h-3.5 text-caption" aria-hidden="true" />
                  {hostname(project.websiteUrl)}
                </a>
              )}
              {project.twitterUrl && (
                <a
                  href={href(project.twitterUrl)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 text-[12px] text-white/85 hover:text-primary-light"
                >
                  <SocialIcon id="x" className="w-3 h-3 text-caption" />
                  {twitterHandle(project.twitterUrl)}
                </a>
              )}
              {project.youtubeUrl && (
                <a
                  href={href(project.youtubeUrl)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 text-[12px] text-white/85 hover:text-primary-light"
                >
                  <SocialIcon id="youtube" className="w-3.5 h-3.5 text-caption" />
                  YouTube
                  <ExternalLink className="w-3 h-3 text-caption" aria-hidden="true" />
                </a>
              )}
            </div>
          ) : null}

          <div className="mt-auto pt-4 flex items-center gap-2 min-w-0">
            <BrandAvatar
              src={bidderAvatar}
              alt={bidder.name}
              fallbackSeed={bidder.wallet}
              size={22}
            />
            <p className="text-[12px] text-caption truncate">
              {bidder.name}
              <span className="mx-1.5 text-line-strong">·</span>
              <span className="numeric">{shortAddress(bidder.wallet)}</span>
              {bidder.bidCount > 1 ? (
                <>
                  <span className="mx-1.5 text-line-strong">·</span>
                  {bidder.bidCount} bids
                </>
              ) : null}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

export function AuctionBidders({
  bidders,
  loading,
}: {
  bidders: ListingBidder[] | null;
  loading?: boolean;
}) {
  if (loading || bidders === null) {
    return (
      <div className="space-y-3">
        <div className="h-5 w-40 animate-pulse rounded bg-white/[0.04]" />
        <div className="card h-36 animate-pulse bg-white/[0.03]" />
        <div className="card h-36 animate-pulse bg-white/[0.03]" />
      </div>
    );
  }

  if (bidders.length === 0) {
    return (
      <Card className="px-5 py-8 text-center">
        <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl border border-primary/30 bg-primary/10">
          <Users className="w-5 h-5 text-primary-light" aria-hidden="true" />
        </span>
        <p className="mt-4 text-[15px] font-semibold text-white">No bids yet</p>
        <p className="mt-1.5 text-[13px] text-caption max-w-sm mx-auto leading-relaxed">
          The first bid opens this list — every project that enters the auction shows up here.
        </p>
      </Card>
    );
  }

  return (
    <section className="space-y-3" aria-labelledby="auction-bidders-heading">
      <div className="flex items-end justify-between gap-3">
        <h2 id="auction-bidders-heading" className="text-[15px] font-bold text-white">
          Bids on this auction
        </h2>
        <p className="text-[12px] text-caption">
          {bidders.length} {bidders.length === 1 ? "bidder" : "bidders"}
        </p>
      </div>
      <div className="space-y-3">
        {bidders.map((bidder) => (
          <BidderCard key={bidder.wallet} bidder={bidder} />
        ))}
      </div>
    </section>
  );
}
