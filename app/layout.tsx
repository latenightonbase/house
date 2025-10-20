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
  const URL = "https://www.houseproto.fun";
  const IMAGE = "https://www.houseproto.fun/pfp.jpg";

  return {
    title: "Auction House",
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
      title: "Auction House",
      description:
        "Your House. Their Bids. The Exchange for Attention Lives here.",
      url: URL,
      siteName: "Auction House",
      images: [
        {
          url: IMAGE,
          width: 1200,
          height: 630,
          alt: "Auction House",
        },
      ],
      locale: "en_US",
      type: "website",
    },

    // 🔹 Twitter Card metadata
    twitter: {
      card: "summary_large_image",
      title: "Auction House",
      description:
        "Your House. Their Bids. The Exchange for Attention Lives here.",
      creator: "@houseproto",
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
            name: "Auction House",
            url: URL,
            splashImageUrl: IMAGE,
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
            <div className="lg:ml-64 pt-12 lg:pt-0">
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
