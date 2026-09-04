"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Crown } from "lucide-react";
import { PageShell, Section, Placeholder } from "@/components/PageShell";
import { brandMarkDataUri } from "@/lib/brandMark";
import { fetchLeaderboard, type Leader } from "@/lib/dailyAuction";
import { isUnoptimizedSrc } from "@/lib/imageSrc";
import { shortAddress } from "@/lib/utils";

/** Gold, silver, bronze — everything below rank 3 stays neutral. */
const RANK_STYLE = [
  "bg-warning/15 border-warning/40 text-warning",
  "bg-white/[0.06] border-line-strong text-white/80",
  "bg-[#b45309]/15 border-[#b45309]/40 text-[#f0b27a]",
];

function LeaderRow({ leader, rank }: { leader: Leader; rank: number }) {
  const [failed, setFailed] = useState(false);
  const avatar = !failed && leader.imageUrl ? leader.imageUrl : brandMarkDataUri(leader.name, true);

  return (
    <tr className="row-hover border-t border-line">
      <td className="py-3.5 pl-4 pr-2 w-14">
        <span
          className={`flex items-center justify-center w-8 h-8 rounded-lg border text-[12px] font-bold numeric ${
            RANK_STYLE[rank - 1] ?? "bg-white/[0.03] border-line text-caption"
          }`}
        >
          {rank}
        </span>
      </td>
      <td className="py-3.5 px-2">
        <div className="flex items-center gap-3 min-w-0">
          <Image
            src={avatar}
            alt=""
            width={36}
            height={36}
            unoptimized={isUnoptimizedSrc(avatar)}
            onError={() => setFailed(true)}
            className="w-9 h-9 rounded-full object-cover border border-line shrink-0"
          />
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-white truncate">{leader.name}</p>
            <p className="text-[11px] text-caption numeric">{shortAddress(leader.wallet)}</p>
          </div>
        </div>
      </td>
      <td className="py-3.5 px-2 text-right">
        <span className="text-[14px] font-bold text-warning numeric">{leader.wins}</span>
      </td>
      <td className="py-3.5 px-2 text-right hidden sm:table-cell">
        <span className="text-[13px] text-caption numeric">{leader.bidCount}</span>
      </td>
      <td className="py-3.5 px-2 text-right hidden md:table-cell">
        <span className="text-[13px] text-white numeric">
          ${leader.highestBid.toLocaleString()}
        </span>
      </td>
      <td className="py-3.5 pl-2 pr-4 text-right">
        <span className="text-[14px] font-bold text-primary-bright numeric">
          ${leader.totalBid.toLocaleString()}
        </span>
      </td>
    </tr>
  );
}

export function LeaderboardClient() {
  const [leaders, setLeaders] = useState<Leader[] | null>(null);

  useEffect(() => {
    fetchLeaderboard(50)
      .then(setLeaders)
      .catch(() => setLeaders([]));
  }, []);

  return (
    <PageShell
      eyebrow="Leaderboard"
      title="Who is buying"
      titleAccent="the most attention"
      intro="Ranked by auctions won, then by everything committed across every bid. Bidding hard counts even when you lose."
    >
      <Section className="p-0 sm:p-0 overflow-hidden">
        {leaders === null ? (
          <div className="h-64 animate-pulse bg-white/[0.02]" />
        ) : leaders.length === 0 ? (
          <div className="py-14 text-center px-5">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl border border-primary/30 bg-primary/10">
              <Crown className="w-5 h-5 text-primary-light" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-[17px] font-bold text-white">No bids yet</h2>
            <p className="mt-2 text-[13px] text-caption max-w-sm mx-auto leading-relaxed">
              The board fills up as soon as the first auction takes a bid.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left">
              <thead>
                <tr className="panel-label">
                  <th scope="col" className="py-3 pl-4 pr-2 font-semibold">
                    #
                  </th>
                  <th scope="col" className="py-3 px-2 font-semibold">
                    Project
                  </th>
                  <th scope="col" className="py-3 px-2 font-semibold text-right">
                    Wins
                  </th>
                  <th scope="col" className="py-3 px-2 font-semibold text-right hidden sm:table-cell">
                    Bids
                  </th>
                  <th scope="col" className="py-3 px-2 font-semibold text-right hidden md:table-cell">
                    Best bid
                  </th>
                  <th scope="col" className="py-3 pl-2 pr-4 font-semibold text-right">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaders.map((leader, index) => (
                  <LeaderRow key={leader.wallet} leader={leader} rank={index + 1} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Seasons & prizes">
        <Placeholder>
          Season resets, streak bonuses and rewards for repeat bidders go here.
        </Placeholder>
      </Section>
    </PageShell>
  );
}
