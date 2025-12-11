"use server"
import BidPage from "@/components/BidsPage";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ blockchainAuctionId: string }> }): Promise<Metadata> {
  
  const {blockchainAuctionId} = await params;
  console.log("blockchainAuctionId:", blockchainAuctionId);
  const URL = `${process.env.NEXT_PUBLIC_DOMAIN}/bid/${blockchainAuctionId}`;
  const IMAGE = `${process.env.NEXT_PUBLIC_DOMAIN}/pfp.jpg`;

  return {
    title: "House",
    description:
      "Your House. Their Bids. The Exchange for Attention Lives here.",
    // 🔹 Farcaster frame metadata
    other: {
      "fc:frame": JSON.stringify({
        version: "next",
        imageUrl: IMAGE,
        button: {
          title: "View Auction",
          action: {
            type: "launch_frame",
            name: "House",
            url: URL,
            splashImageUrl: IMAGE,
            splashBackgroundColor: "#000000",
          },
        },
      }),
    },
  };
}

export default async function AuctionPage(){
  return <>
    <BidPage/>
  </>
}