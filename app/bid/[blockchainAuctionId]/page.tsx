"use server"
import BidPage from "@/components/BidsPage";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const URL = process.env.NEXT_PUBLIC_DOMAIN;
  const IMAGE = `${URL}/pfp.jpg`;

  return {
    title: "House",
    description:
      "Your House. Their Bids. The Exchange for Attention Lives here.",
    viewport: {
      width: "device-width",
      initialScale: 1,
      maximumScale: 1,
      userScalable: false,
      viewportFit: "cover",
    },

    // 🔹 Open Graph (Facebook, LinkedIn, Discord)
    openGraph: {
      title: "House",
      description:
        "Your House. Their Bids. The Exchange for Attention Lives here.",
      url: URL,
      siteName: "House",
      images: [
        {
          url: IMAGE,
          width: 1200,
          height: 630,
          alt: "House",
        },
      ],
      locale: "en_US",
      type: "website",
    },

    // 🔹 Twitter Card metadata
    twitter: {
      card: "summary_large_image",
      title: "House",
      description:
        "Your House. Their Bids. The Exchange for Attention Lives here.",
      creator: "@latenightonbase",
      images: [IMAGE],
    },

    // 🔹 Discord embeds & others (covered by OG tags)
    // Discord uses Open Graph automatically, so no separate section needed

    // 🔹 Farcaster frame metadata
    other: {
      "fc:frame": JSON.stringify({
        version: "next",
        imageUrl: IMAGE,
        button: {
          title: "Bid Now!",
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