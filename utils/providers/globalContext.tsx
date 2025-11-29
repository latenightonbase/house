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
    username?: string;
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
  isDesktopWallet: boolean;
  hasTwitterProfile: boolean;
  authenticateWithTwitter: () => Promise<void>;
  refreshTwitterProfile: () => Promise<void>;
}

// Create a context with a default value matching the expected structure
const GlobalContext = createContext<GlobalContextProps | null>(null);

export const GlobalProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session } = useSession() as { data: CustomSession | null };
  const { context } = useMiniKit();
  const { signIn } = useAuthenticate();
  const { login, getAccessToken } = usePrivy();
  const [user, setUser] = useState<any | null>(null);
  const [authenticatedUser, setAuthenticatedUser] = useState<any | null>(null);
  const [hasTwitterProfile, setHasTwitterProfile] = useState<boolean>(false);
  const {address, isDisconnected} = useAccount()

  // Check if user is using desktop wallet (no MiniKit context)
  const isDesktopWallet = !context?.client;

  const authenticateWithTwitter = async (): Promise<void> => {
    try {
      await login();
    } catch (error) {
      console.error('Twitter authentication error:', error);
      toast.error('Failed to authenticate with Twitter');
    }
  };

  const refreshTwitterProfile = async (): Promise<void> => {
    await checkTwitterProfile();
  };

  const checkTwitterProfile = async () => {
    if (session?.wallet) {
      try {
        console.log('Checking Twitter profile for wallet:', session.wallet);
        const response = await fetch(`/api/users/${session.wallet}`);
        if (response.ok) {
          const userData = await response.json();
          console.log('User data:', userData);
          const hasTwitter = !!userData.user?.twitterProfile?.id;
          console.log('Has Twitter profile:', hasTwitter);
          setHasTwitterProfile(hasTwitter);
        }
      } catch (error) {
        console.error('Error checking Twitter profile:', error);
      }
    }
  };

  const updateUserFid = async () => {
    try {
      
      if (session?.fid && session.fid.startsWith('none') && address && context?.user?.fid) {
        const accessToken = await getAccessToken();
        const response = await fetch('/api/protected/user/update-fid', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            wallet: address,
            fid: context.user.fid,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log('FID updated successfully:', result);
        } else {
          console.error('Failed to update FID:', await response.text());
        }
      }
    } catch (error) {
      console.error('Error updating user FID:', error);
    }
  };

  const handleUserDetails = async (): Promise<void> => {
    try {
      let user: any = null;

      if (context?.client) {
        // Fetch user data from database to get notificationDetails
        let notificationDetails = null;
        if (context?.user?.fid) {
          try {
            const dbResponse = await fetch(`/api/users/${context.user.fid}`);
            if (dbResponse.ok) {
              const dbUser = await dbResponse.json();
              notificationDetails = dbUser.user?.notificationDetails;
            }
          } catch (error) {
            console.error("Error fetching notification details:", error);
          }
        }
        
        user = {
          username: context?.user.displayName,
          pfp_url: context?.user.pfpUrl,
          fid: context?.user.fid,
          notificationDetails,
        };
      } else if (session?.wallet) {

        console.log("Session wallet:", session.wallet);

        const walletAddress = session.wallet;

        // First, try to fetch user from database
        try {
          const dbResponse = await fetch(`/api/users/${walletAddress}`);

          console.log("Database response status:", dbResponse);

          if (dbResponse.ok) {
            const dbUser = await dbResponse.json();

            console.log("Database user fetched:", dbUser);

            if (dbUser.user && dbUser.user.username) {
              // Use database username and profile data
              user = {
                username: dbUser.user.username,
                pfp_url: dbUser.user.pfp_url || `https://api.dicebear.com/5.x/identicon/svg?seed=${walletAddress}`,
                fid: dbUser.user.fid || walletAddress,
                wallet: dbUser.user.wallet,
                notificationDetails: dbUser.user.notificationDetails,
              };
              setUser(user);
              return;
            }
          }
        } catch (error) {
          console.error("Error fetching user from database:", error);
        }

        // Fallback to ENS/wallet display if no database user found
        const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);

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
          ensImage = `https://api.dicebear.com/5.x/identicon/svg?seed=${walletAddress}`;
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
        checkTwitterProfile();
        
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
        isDesktopWallet,
        hasTwitterProfile,
        authenticateWithTwitter,
        refreshTwitterProfile,
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
