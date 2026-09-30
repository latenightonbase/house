import type { Metadata } from "next";
import { loadMarketplaceListings } from "@/lib/home-data";
import { MarketplaceClient } from "./MarketplaceClient";

export const revalidate = 20;

export const metadata: Metadata = {
  title: "Media Marketplace — LNOC",
  description: "Every live placement on LNOC — auctions and buy-now attention from creators.",
};

export default async function MarketplacePage() {
  const listings = await loadMarketplaceListings();
  return <MarketplaceClient initialListings={listings} />;
}
