'use client'
import { useEffect, useState } from "react";
import NProgress from "nprogress";
import LandingAuctions from "@/components/LandingAuctions";
import PageLayout from "@/components/UI/PageLayout";
import Welcome from "@/components/Welcome";
import InfoCarousel from "@/components/InfoCarousel";
// import { UsernameManager } from "@/components/UI/UsernameManager";

NProgress.configure({ showSpinner: false });

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate progress bar loading
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 10;
      });
    }, 200);
    
    // Complete the progress bar after a short delay
    const completeTimer = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setLoading(false);
      }, 300);
    }, 1000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(completeTimer);
    };
  }, []);

  if (loading) {
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
      <InfoCarousel/>
      <LandingAuctions/>
     
    </PageLayout>
  );
}
