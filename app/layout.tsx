import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { MiniKitContextProvider } from "@/utils/providers/MiniKitProvider";
import Background from "@/components/UI/Background";
import Navbar from "@/components/UI/Navbar";
import { NProgressProvider } from "@/utils/useNavigateWithLoader";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const URL = "https://farcaster-miniapp-liart.vercel.app";
  return {
    title: "Late Night on Base",
    description:
      "Daily Base ecosystem updates in 60 seconds, plus replays of top streams featuring the builders shaping the future. Hosted by Bill the Bull.",
    other: {
      "fc:frame": JSON.stringify({
        version: "next",
        imageUrl: "https://farcaster-miniapp-liart.vercel.app/pfp.jpg",
        button: {
          title: `Tune in!`,
          action: {
            type: "launch_frame",
            name: "Late Night on Base",
            url: URL,
            splashImageUrl:
              "https://farcaster-miniapp-liart.vercel.app/pfp.jpg",
            splashBackgroundColor: "#3b0404",
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
          </MiniKitContextProvider>
        </NProgressProvider>
      </body>
    </html>
  );
}
