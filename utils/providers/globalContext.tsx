import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { usePrivy } from "@privy-io/react-auth";
import { useLoginToMiniApp } from "@privy-io/react-auth/farcaster";
import { useAuthenticate, useMiniKit } from "@coinbase/onchainkit/minikit";
import { generateNonce } from "siwe";
import { signOut, useSession } from "next-auth/react";
import { ethers } from "ethers";
import { useAccount } from "wagmi";

interface GlobalContextProps {
  user: any;
  authenticatedUser: any;
  isAuthenticated: boolean;
}

// Create a context with a default value matching the expected structure
const GlobalContext = createContext<GlobalContextProps | null>(null);

export const GlobalProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session } = useSession();
  const { context } = useMiniKit();
  const { signIn } = useAuthenticate();
  const [user, setUser] = useState<any | null>(null);
  const [authenticatedUser, setAuthenticatedUser] = useState<any | null>(null);
  const {address, isDisconnected} = useAccount()

  const handleUserDetails = async (): Promise<void> => {
    if (user) return;
    try {
      let user: any = null;

      if (context?.client) {
        user = {
          username: context?.user.displayName,
          pfp_url: context?.user.pfpUrl,
          fid: context?.user.fid,
        };
      } else if (session?.wallet) {

        console.log("Session wallet:", session.wallet);

        const walletAddress = session.wallet;
        const provider = new ethers.providers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);

        // Fetch ENS name
        let ensName = await provider.lookupAddress(walletAddress);
        if (!ensName) {
          ensName = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
        }

        // Fetch ENS image
        let ensImage = null;
        try {
          const resolver = await provider.getResolver(walletAddress);
          ensImage = await resolver?.getText("avatar");
        } catch (error) {
          console.error("Error fetching ENS image:", error);
        }

        // Fallback image generation
        if (!ensImage) {
          ensImage = `https://api.dicebear.com/5.x/identicon/svg?seed=${walletAddress.toLowerCase()}`;
        }

        user = {
          username: ensName,
          pfp_url: ensImage,
          fid: walletAddress,
        };
      }

      setUser(user);
    } catch (error) {
      console.error("Sign in error:", error);
    }
  };

  useEffect(() => {
    (async () => {
      if (process.env.NEXT_PUBLIC_ENV !== "DEV") {
        sdk.actions.ready();
      }

      if (session?.user) {
        handleUserDetails();
      }
    })();
  }, [context, session]);

  return (
    <GlobalContext.Provider
      value={{
        user,
        authenticatedUser,
        isAuthenticated: !!authenticatedUser,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export function useGlobalContext() {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error("useGlobalContext must be used within a GlobalProvider");
  }
  return context;
}

// Extend the Session type from next-auth to include an optional wallet property
declare module "next-auth" {
  interface Session {
    wallet?: string;
  }
}
