'use client'
import LandingAuctions from "@/components/LandingAuctions";
import PageLayout from "@/components/UI/PageLayout";
import Welcome from "@/components/Welcome";

export default function Home() {

  return (
    <PageLayout 
      className="min-h-screen flex flex-col items-start justify-start"
    >
      <Welcome/>
      <LandingAuctions/>
     
    </PageLayout>
  );
}
