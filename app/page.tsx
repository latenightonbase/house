'use client'
import { WalletConnect } from "@/components/Web3/walletConnect";
import Image from "next/image";
import PageLayout from "@/components/UI/PageLayout";
import Welcome from "@/components/Welcome";

export default function Home() {
  return (
    <PageLayout 
      className="min-h-screen flex flex-col items-start justify-start"
    >
      <Welcome/>
     
    </PageLayout>
  );
}
