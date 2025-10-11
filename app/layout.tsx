import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { MiniKitContextProvider } from "@/utils/providers/MiniKitProvider";
import Background from "@/components/UI/Background";
import Navbar from "@/components/UI/Navbar";
import { NProgressProvider } from "@/utils/useNavigateWithLoader";
import { Toaster } from "react-hot-toast";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const URL = "https://auction-house-red.vercel.app";
  return {
    title: "Auction House",
    description:
      "Create, bid, and trade NFTs seamlessly on Base with our Auction House.",
    viewport: {
      width: "device-width",
      initialScale: 1,
      maximumScale: 1,
      userScalable: false,
      viewportFit: "cover"
    },
    other: {
      "fc:frame": JSON.stringify({
        version: "next",
        imageUrl: "https://auction-house-red.vercel.app/pfp.jpg",
        button: {
          title: `Bid Now!`,
          action: {
            type: "launch_frame",
            name: "Auction House",
            url: URL,
            splashImageUrl:
              "https://auction-house-red.vercel.app/pfp.jpg",
            splashBackgroundColor: "#000000",
          },
        },
      }),
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${poppins.className} antialiased`}
      >
        <NProgressProvider>
          <MiniKitContextProvider>
            <Navbar/>
            <div className="md:ml-64 pt-12 md:pt-0">
              {children}
            </div>
            <Background />
            <Toaster 
              position="top-center"
              toastOptions={{
                duration: 8000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  style: {
                    background: '#4bb878',
                    color: '#fff',
                  },
                },
                error: {
                  style: {
                    background: '#ef4444',
                    color: '#fff',
                  },
                },
              }}
            />
          </MiniKitContextProvider>
        </NProgressProvider>
      </body>
    </html>
  );
}
