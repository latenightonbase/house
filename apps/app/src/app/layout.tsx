import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/Header";
import { Background } from "@/components/Background";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${inter.className} antialiased text-white max-lg:pb-10`}
      >
        <Providers>
          <Header />
          <main className="lg:pl-[212px] max-lg:pt-14">
            <div className="lg:px-6 lg:py-6 max-lg:px-3 max-lg:py-4 max-lg:pb-28 lg:max-w-[1560px] lg:mx-auto max-lg:w-screen">
              {children}
            </div>
          </main>
          <Background />
        </Providers>
      </body>
    </html>
  );
}
