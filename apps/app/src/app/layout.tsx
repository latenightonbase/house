import type { Metadata, Viewport } from "next";
import { Inter, Permanent_Marker } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Background } from "@/components/Background";
import { NavigationProgress } from "@/components/NavigationProgress";
import { Sidebar } from "@/components/nav/Sidebar";
import { MobileNav } from "@/components/nav/MobileNav";
import { Footer } from "@/components/nav/Footer";
import { SITE, SOCIAL_LINKS } from "@/lib/constants";

function siteUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return "http://localhost:3002";
}

const title = `${SITE.shortName} — ${SITE.tagline}`;
const description = `${SITE.strapline} ${SITE.keywords}`;
const twitterHandle = SOCIAL_LINKS.find((link) => link.id === "x")?.handle;

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
  metadataBase: new URL(siteUrl()),
  title,
  description,
  applicationName: SITE.name,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: SITE.name,
    title,
    description,
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: `${SITE.name} — ${SITE.tagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    creator: twitterHandle,
    images: ["/og.png"],
  },
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
