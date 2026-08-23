import type { NextConfig } from "next";
import path from "path";

/**
 * DEMO MODE
 * =========
 * Routes `@privy-io/react-auth` to a local stub so the UI runs without live
 * Privy credentials. Set to `false` (or remove the webpack block below) to
 * restore real auth; also drop the matching `paths` entries in tsconfig.json.
 */
const DEMO_AUTH = true;

const nextConfig: NextConfig = {
  // The dev overlay defaults to bottom-left, where it covers the sidebar's
  // account block and theme toggle.
  devIndicators: {
    position: "bottom-right",
  },

  webpack: (config) => {
    if (DEMO_AUTH) {
      const stub = path.resolve(__dirname, "utils/demo/privyMock.tsx");
      config.resolve.alias = {
        ...config.resolve.alias,
        "@privy-io/react-auth/farcaster": stub,
        "@privy-io/react-auth": stub,
      };
    }
    return config;
  },

  // Compiler optimizations
  compiler: {
   
  },
  
  // Increase API body size limit for image uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Adjust as needed (e.g., '50mb')
    },
  },
  
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.farcaster.xyz",
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
        // Resolves an X handle to that account's profile image. Used by the
        // demo fixtures so real creator/brand marks render without checking
        // third-party image files into this repo.
        protocol: "https",
        hostname: "unavatar.io",
      },
      {
        protocol: "https",
        hostname: "abs.twimg.com",
      },
    ],
  },
  
  // Optimize production builds
  productionBrowserSourceMaps: false,
};

export default nextConfig;
