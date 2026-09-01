import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/Header";
import { Background } from "@/components/Background";
import { NavigationProgress } from "@/components/NavigationProgress";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "LNOC — Attention Marketplace",
  description: "The marketplace for attention. Creators sell reach, brands buy it.",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#06080f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${inter.className} antialiased text-white`}
      >
        <Providers>
          <NavigationProgress />
          <Header />
          <main className="min-w-0 lg:pl-[212px] max-lg:pt-[var(--mobile-header-offset)]">
            <div className="min-w-0 w-full lg:mx-auto lg:max-w-[1560px] lg:px-6 lg:py-6 max-lg:px-3.5 max-lg:py-4 max-lg:pb-[calc(var(--mobile-nav-offset)+1.25rem)]">
              {children}
            </div>
          </main>
          <Background />
        </Providers>
      </body>
    </html>
  );
}
