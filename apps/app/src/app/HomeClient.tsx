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
import { MediaListings } from "@/components/dashboard/MediaListings";

export default function HomeClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { status } = useSession();
  const { openConnectModal } = useConnectModal();
  const authRequired = searchParams.get("auth") === "required";

  const { stats, featured, listings, loading } = useDashboardData();

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

        {featured && (
          <FeaturedAuction
            listing={featured}
            onView={(id) => router.push(`/listings/${id}`)}
          />
        )}

        <MediaListings listings={listings} loading={loading} />
      </div>
    </div>
  );
}
