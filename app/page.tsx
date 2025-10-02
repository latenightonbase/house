'use client'
import { WalletConnect } from "@/components/Web3/walletConnect";
import Image from "next/image";
import PageLayout from "@/components/UI/PageLayout";

export default function Home() {
  return (
    <PageLayout 
      className="min-h-screen flex flex-col items-center justify-center"
    >
      <div className="space-y-8">
        {/* Your existing content will go here */}
        <div className="text-center">
          <p className="text-lg text-secondary">
            Start exploring auctions or create your own!
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
