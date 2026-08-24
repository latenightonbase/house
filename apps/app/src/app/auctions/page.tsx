"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { LiveAuctions } from "@/components/dashboard/LiveAuctions";
import { fetchAuctions, formatMoney, type Auction } from "@/lib/marketplace";

export default function AuctionsPage() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchAuctions({ status: "live", limit: 50 })
      .then((data) => !cancelled && setAuctions(data))
      .catch(() => !cancelled && setAuctions([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const openValue = auctions.reduce((sum, a) => sum + a.minimumBid, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Auctions"
        subtitle="Premium inventory that clears by bidding — the slots where demand exceeds supply."
        action={
          <div className="text-right">
            <p className="panel-label">Open inventory</p>
            <p className="text-xl font-bold text-white numeric">{formatMoney(openValue)}</p>
          </div>
        }
      />
      <LiveAuctions auctions={auctions} loading={loading} />
    </div>
  );
}
