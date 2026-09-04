import type { NextConfig } from "next";

function apiOrigin() {
  const raw = (process.env.API_ORIGIN || "").trim();
  return (raw || (process.env.VERCEL ? "https://api.lnoc.app" : "http://localhost:3001"))
    .replace(/\/+$/, "")
    .replace(/\/backend$/i, "");
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "**.cloudfront.net" },
      { protocol: "https", hostname: "**.twimg.com" },
      { protocol: "https", hostname: "**.ggpht.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "**.ytimg.com" },
      { protocol: "https", hostname: "**.cdninstagram.com" },
      { protocol: "https", hostname: "**.fbcdn.net" },
      { protocol: "https", hostname: "**.tiktokcdn.com" },
      { protocol: "https", hostname: "**.tiktokcdn-us.com" },
      { protocol: "https", hostname: "**.tiktokcdn-eu.com" },
      { protocol: "https", hostname: "i.pravatar.cc" },
    ],
  },
  async rewrites() {
    return {
      // Edge proxy — Railway also accepts `/backend/*`, so a kept prefix still works.
      beforeFiles: [
        {
          source: "/backend/:path*",
          destination: `${apiOrigin()}/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
