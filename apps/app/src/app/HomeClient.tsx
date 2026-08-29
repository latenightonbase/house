"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useSession } from "@/components/SessionProvider";
import { useDashboardData } from "@/lib/useDashboardData";
import { Button, Tile } from "@/components/ui";
import { Topbar } from "@/components/dashboard/Topbar";
import { MarketStrip } from "@/components/dashboard/MarketStrip";
import { FeaturedAuction } from "@/components/dashboard/FeaturedAuction";
import {
  EndingSoonCard,
  MostBookedCard,
  NewCampaignCard,
  TrendingCreatorCard,
} from "@/components/dashboard/SpotlightCards";
import { TrendingCreators } from "@/components/dashboard/TrendingCreators";
import { LiveAuctions } from "@/components/dashboard/LiveAuctions";
import { RecentlyBooked } from "@/components/dashboard/RecentlyBooked";
import { MediaListings } from "@/components/dashboard/MediaListings";

export default function HomeClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { status } = useSession();
  const { openConnectModal } = useConnectModal();
  const authRequired = searchParams.get("auth") === "required";

  const {
    stats,
    featured,
    liveAuctions,
    endingSoon,
    creators,
    trendingCreator,
    mostBooked,
    newCampaign,
    bookings,
    listings,
    loading,
  } = useDashboardData();

  useEffect(() => {
    if (authRequired && status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [authRequired, status, router]);

  return (
    <div className="w-full space-y-4">
      {authRequired && status !== "authenticated" ? (
        <Tile className="border-warning/30 bg-warning/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-[13px] text-warning">Connect your wallet to continue.</p>
          <Button onClick={() => openConnectModal?.()} size="sm" className="shrink-0">
            Connect wallet
          </Button>
        </Tile>
      ) : null}

      <Topbar />

      <div className="space-y-4">
        <MarketStrip stats={stats} />

        {featured && <FeaturedAuction auction={featured} />}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {trendingCreator && <TrendingCreatorCard creator={trendingCreator} />}
          {mostBooked && <MostBookedCard creator={mostBooked} />}
          {endingSoon && <EndingSoonCard auction={endingSoon} />}
          {newCampaign && <NewCampaignCard campaign={newCampaign} />}
        </div>

        <MediaListings listings={listings} loading={loading} />

        {/* Creator table beside the open auction list */}
        <div className="grid gap-4 grid-cols-1 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start">
          <TrendingCreators creators={creators} loading={loading} />
          <LiveAuctions auctions={liveAuctions} loading={loading} />
        </div>
        <RecentlyBooked bookings={bookings} loading={loading} />
      </div>
    </div>
  );
}
