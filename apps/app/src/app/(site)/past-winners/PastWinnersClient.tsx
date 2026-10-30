"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ExternalLink, Trophy } from "lucide-react";
import { PageShell, Section, Placeholder } from "@/components/PageShell";
import { SocialIcon } from "@/components/nav/SocialIcons";
import { billboardPlaceholder } from "@/lib/brandMark";
import { fetchPastWinners, type PastWinner } from "@/lib/dailyAuction";
import { isUnoptimizedSrc } from "@/lib/imageSrc";

function settledLabel(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso)
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    .toUpperCase();
}

function href(url: string) {
  return url.startsWith("http") ? url : `https://${url}`;
}

function WinnerCard({ winner }: { winner: PastWinner }) {
  const [failed, setFailed] = useState(false);
  const artwork =
    !failed && winner.imageUrl ? winner.imageUrl : billboardPlaceholder(winner.name);

  return (
    <article className="card overflow-hidden flex flex-col">
      <div className="relative aspect-[16/9] bg-surface-2">
        <Image
          src={artwork}
          alt={winner.name}
          fill
          sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
          unoptimized={isUnoptimizedSrc(artwork)}
          onError={() => setFailed(true)}
          className="object-cover"
        />
        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-md bg-background/80 backdrop-blur-sm border border-line px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-caption">
          {settledLabel(winner.settledAt)}
        </span>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <h2 className="text-[16px] font-bold text-white truncate">{winner.name}</h2>
        {winner.description && (
          <p className="mt-2 text-[13px] leading-relaxed text-caption line-clamp-3">
            {winner.description}
          </p>
        )}

        <div className="mt-4 pt-4 border-t border-line flex items-center gap-3">
          <div className="min-w-0">
            <p className="panel-label">Winning bid</p>
            <p className="mt-1 text-[18px] font-bold text-primary-bright numeric">
              ${winner.winningBid.toLocaleString()}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            {winner.twitterUrl && (
              <a
                href={href(winner.twitterUrl)}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={`${winner.name} on X`}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-line text-caption hover:text-white hover:border-primary/60"
              >
                <SocialIcon id="x" className="w-3.5 h-3.5" />
              </a>
            )}
            {winner.youtubeUrl && (
              <a
                href={href(winner.youtubeUrl)}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={`${winner.name} on YouTube`}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-line text-caption hover:text-white hover:border-primary/60"
              >
                <SocialIcon id="youtube" className="w-4 h-4" />
              </a>
            )}
            {winner.websiteUrl && (
              <a
                href={href(winner.websiteUrl)}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={`Visit ${winner.name}`}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-line text-caption hover:text-white hover:border-primary/60"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function PastWinnersClient() {
  const [winners, setWinners] = useState<PastWinner[] | null>(null);

  useEffect(() => {
    fetchPastWinners(48)
      .then(setWinners)
      .catch(() => setWinners([]));
  }, []);

  return (
    <PageShell
      eyebrow="Past winners"
      title="Everyone who has held"
      titleAccent="the billboard"
      intro="Every settled attention auction, newest first — the project, what it paid, and where to find it."
    >
      {winners === null ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card h-[340px] animate-pulse bg-white/[0.02]" />
          ))}
        </div>
      ) : winners.length === 0 ? (
        <Section>
          <div className="py-8 text-center">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl border border-primary/30 bg-primary/10">
              <Trophy className="w-5 h-5 text-primary-light" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-[17px] font-bold text-white">No winners yet</h2>
            <p className="mt-2 text-[13px] text-caption max-w-sm mx-auto leading-relaxed">
              The first auction has not settled. Whoever wins it opens this page.
            </p>
          </div>
        </Section>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {winners.map((winner) => (
            <WinnerCard key={winner.listingId} winner={winner} />
          ))}
        </div>
      )}

      <Section title="Hall of fame">
        <Placeholder>
          Editorial write-ups, clip embeds and results from each spotlight appearance go here.
        </Placeholder>
      </Section>
    </PageShell>
  );
}
