"use client";

import NProgress from "nprogress";
import { useNavigateWithLoader } from "@/utils/useNavigateWithLoader";
import { useDashboardData } from "@/utils/useDashboardData";
import Topbar from "@/components/dashboard/Topbar";
import FeaturedAuction from "@/components/dashboard/FeaturedAuction";
import {
  TrendingCreatorCard,
  MostBookedCard,
  EndingSoonCard,
  NewCampaignCard,
} from "@/components/dashboard/SpotlightCards";
import TrendingCreators from "@/components/dashboard/TrendingCreators";
import LiveAuctions from "@/components/dashboard/LiveAuctions";
import RecentlyBooked from "@/components/dashboard/RecentlyBooked";

NProgress.configure({ showSpinner: false });

export default function HomePage() {
  const navigate = useNavigateWithLoader();
  const {
    viewer,
    stats,
    featured,
    liveAuctions,
    endingSoon,
    creators,
    trendingCreator,
    mostBooked,
    newCampaign,
    bookings,
    loading,
  } = useDashboardData();

  const openAuction = (id: string) => navigate(`/bid/${id}`);
  const openCreator = (id: string) => navigate(`/user/${id}`);

  return (
    <div className="w-full">
      <Topbar
        stats={stats}
        viewer={viewer}
        notificationCount={2}
        onOpenProfile={() => navigate("/profile")}
      />

      <div className="space-y-4">
        {/* Row 1 — featured auction beside the spotlight grid */}
        <div className="grid gap-4 grid-cols-1 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] items-start">
          {featured && (
            <FeaturedAuction auction={featured} onView={openAuction} />
          )}

          {/* Two-up at every width so the four spotlights stay a compact
              2x2 block rather than a long stack on phones. */}
          <div className="grid grid-cols-2 gap-3 xl:gap-4">
            {trendingCreator && (
              <TrendingCreatorCard
                creator={trendingCreator}
                onOpen={openCreator}
              />
            )}
            {mostBooked && (
              <MostBookedCard
                creator={mostBooked}
                bookings={mostBooked.bookingsThisMonth}
                onOpen={openCreator}
              />
            )}
            {endingSoon && (
              <EndingSoonCard auction={endingSoon} onOpen={openAuction} />
            )}
            {newCampaign && <NewCampaignCard campaign={newCampaign} />}
          </div>
        </div>

        {/* Row 2 — creator table beside the live auction list. Both panels are
            column-dense, so they only sit side by side once there is genuinely
            room for six table columns plus a full auction row. */}
        <div className="grid gap-4 grid-cols-1 2xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] items-start">
          <TrendingCreators
            creators={creators}
            loading={loading}
            onOpenCreator={openCreator}
            onViewAll={() => navigate("/leaderboard")}
          />
          <LiveAuctions
            auctions={liveAuctions}
            loading={loading}
            onOpenAuction={openAuction}
            onViewAll={() => navigate("/")}
          />
        </div>

        {/* Row 3 — settled bookings */}
        <RecentlyBooked bookings={bookings} loading={loading} />
      </div>
    </div>
  );
}
