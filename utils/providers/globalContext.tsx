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
import toast from "react-hot-toast";

// Custom session interface to include wallet and fid
interface CustomSession {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    wallet?: string;
    fid?: string;
    token?: string;
  };
  wallet?: string;
  fid?: string;
  token?: string;
  expires: string;
}

interface GlobalContextProps {
  user: any;
  authenticatedUser: any;
  isAuthenticated: boolean;
}

// Create a context with a default value matching the expected structure
const GlobalContext = createContext<GlobalContextProps | null>(null);

export const GlobalProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session } = useSession() as { data: CustomSession | null };
  const { context } = useMiniKit();
  const { signIn } = useAuthenticate();
  const [user, setUser] = useState<any | null>(null);
  const [authenticatedUser, setAuthenticatedUser] = useState<any | null>(null);
  const {address, isDisconnected} = useAccount()

  const updateUserFid = async () => {
    try {
      
      if (session?.fid && session.fid.startsWith('none') && address && context?.user?.fid) {
        const response = await fetch('/api/protected/user/update-fid', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            wallet: address,
            fid: context.user.fid,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log('FID updated successfully:', result);
          toast.success('FID updated successfully');
          toast.success(JSON.stringify(result));
        } else {
          console.error('Failed to update FID:', await response.text());
          toast.error('Failed to update FID');
          toast.error(JSON.stringify(await response.text()));
        }
      }
    } catch (error) {
      console.error('Error updating user FID:', error);
    }
  };

  const handleUserDetails = async (): Promise<void> => {
    if (!session?.fid?.includes("none")) return;
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

      if (session) {
        handleUserDetails();
        
        // Check and update FID if conditions are met
        if (session && address && context?.user) {
          await updateUserFid();
        }
      }
    })();
  }, [context, session, address]);

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
