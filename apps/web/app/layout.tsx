import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { MiniKitContextProvider } from "@/utils/providers/MiniKitProvider";
import Background from "@/components/UI/Background";
import Navbar from "@/components/UI/Navbar";
import { NProgressProvider } from "@/utils/useNavigateWithLoader";
import { Toaster } from "react-hot-toast";
import ReviewFlowManager from "@/components/ReviewFlowManager";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${poppins.className} antialiased text-white`}
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
                duration: 5000,
                style: {
                  background: '#363636',
                  color: '#fff',
                  fontSize: '12px',
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
            <ReviewFlowManager />
          </MiniKitContextProvider>
        </NProgressProvider>
      </body>
    </html>
  );
}
