import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Compiler optimizations
  compiler: {
   
  },
  
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.farcaster.xyz",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https",
        hostname: "*.warpcast.com",
      },
      {
        protocol: "https",
        hostname: "*.pinata.cloud",
      },
      {
        protocol: "https",
        hostname: "*.ipfs.io",
      },
      {
        protocol: "https",
        hostname: "pbs.twimg.com",
      },
      {
        protocol: "https",
        hostname: "abs.twimg.com",
      },
      {
        protocol: "https",
        hostname: "*.s3.*.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "*.cloudfront.net",
      },
    ],
  },
  
  // Optimize production builds
  productionBrowserSourceMaps: false,
};

export default nextConfig;
