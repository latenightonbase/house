import type { Metadata, Viewport } from "next";
import { Inter, Permanent_Marker } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Background } from "@/components/Background";
import { NavigationProgress } from "@/components/NavigationProgress";
import { Sidebar } from "@/components/nav/Sidebar";
import { MobileNav } from "@/components/nav/MobileNav";
import { Footer } from "@/components/nav/Footer";
import { SITE } from "@/lib/constants";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

/** Only the wordmark uses this — loaded once so the lockup never reflows. */
const display = Permanent_Marker({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: `${SITE.shortName} — ${SITE.tagline}`,
  description: `${SITE.strapline} ${SITE.keywords}`,
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#050208",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${display.variable} ${inter.className} antialiased text-white`}
      >
        <Providers>
          <NavigationProgress />
          <Sidebar />
          <MobileNav />
          <main className="min-w-0 lg:pl-[var(--sidebar-width)] max-lg:pt-[var(--mobile-header-offset)]">
            <div className="min-w-0 w-full mx-auto max-w-[1560px] lg:px-8 lg:py-8 max-lg:px-4 max-lg:py-4 max-lg:pb-10">
              {children}
              <Footer />
            </div>
          </main>
          <Background />
        </Providers>
      </body>
    </html>
  );
}
