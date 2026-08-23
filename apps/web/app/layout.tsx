import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { MiniKitContextProvider } from "@/utils/providers/MiniKitProvider";
import Background from "@/components/UI/Background";
import Navbar from "@/components/UI/Navbar";
import { NProgressProvider } from "@/utils/useNavigateWithLoader";
import { Toaster } from "react-hot-toast";
import { XPNotificationProvider } from "@/utils/providers/xpNotificationContext";
import XPParticles from "@/components/UI/XPParticles";
import DailyLoginClaimDrawer from "@/components/DailyLoginClaimDrawer";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

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
        <NProgressProvider>
          <MiniKitContextProvider>
            <XPNotificationProvider>
              <XPParticles />
              <DailyLoginClaimDrawer />
              <Navbar/>
              <main className="lg:pl-[212px] max-lg:pt-14">
                <div className="lg:px-6 lg:py-6 max-lg:px-3 max-lg:py-4 max-lg:pb-28 lg:max-w-[1560px] lg:mx-auto max-lg:w-screen">
                  {children}
                </div>
              </main>
              <Background />
              <Toaster 
                position="top-center"
                toastOptions={{
                  duration: 5000,
                  style: {
                    background: '#0e1422',
                    color: '#eef1fa',
                    fontSize: '13px',
                    border: '1px solid #273049',
                  },
                  success: {
                    style: {
                      background: '#0e1422',
                      color: '#eef1fa',
                      border: '1px solid rgba(47, 211, 131, 0.4)',
                    },
                  },
                  error: {
                    style: {
                      background: '#0e1422',
                      color: '#eef1fa',
                      border: '1px solid rgba(244, 83, 106, 0.4)',
                    },
                  },
                }}
              />
            </XPNotificationProvider>
          </MiniKitContextProvider>
        </NProgressProvider>
      </body>
    </html>
  );
}
