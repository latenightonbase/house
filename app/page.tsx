'use client'
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import NProgress from "nprogress";
import LandingAuctions from "@/components/LandingAuctions";
import PageLayout from "@/components/UI/PageLayout";
import Welcome from "@/components/Welcome";
import { WalletConnect } from "@/components/Web3/walletConnect";
// import { UsernameManager } from "@/components/UI/UsernameManager";

NProgress.configure({ showSpinner: false });

export default function Home() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (status === "loading") {
      // Simulate progress bar loading
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 200);
      
      return () => clearInterval(interval);
    } else {
      // Complete the progress bar and show content regardless of session
      setProgress(100);
      setTimeout(() => {
        setLoading(false);
      }, 300);
    }
  }, [status]);

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen absolute top-0 left-0 lg:left-48 w-full flex flex-col items-center justify-center gap-4 z-50">
        <h1 className="text-3xl text-center font-bold gradient-text">The House <span className="text-white font-semibold max-lg:block max-lg:text-xl animate-pulse">is loading</span></h1>
        <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden my-3">
          <div 
            className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300 ease-out" 
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }


  return (
    <PageLayout 
      className="min-h-screen flex flex-col items-start justify-start"
    >
      {/* <UsernameManager /> */}
      <Welcome/>
      <LandingAuctions/>
     
    </PageLayout>
  );
}
