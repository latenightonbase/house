'use server'
import HomePage from "@/components/HomePage";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const URL = process.env.NEXT_PUBLIC_DOMAIN;
  const IMAGE = `${URL}/pfp.jpg`;

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

export default async function Home(){
  return <>
    <HomePage />
  </>
}