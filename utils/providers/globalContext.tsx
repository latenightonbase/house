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
}

// Create a context with a default value matching the expected structure
const GlobalContext = createContext<GlobalContextProps | null>(null);

export const GlobalProvider = ({ children }: { children: React.ReactNode }) => {
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


  // const updateUserFid = async () => {
  //   try {
      
  //     if (session?.fid && session.fid.startsWith('none') && address && context?.user?.fid) {
  //       const accessToken = await getAccessToken();
  //       const response = await fetch('/api/protected/user/update-fid', {
  //         method: 'POST',
  //         headers: {
  //           'Content-Type': 'application/json',
  //           'Authorization': `Bearer ${accessToken}`,
  //         },
  //         body: JSON.stringify({
  //           wallet: address,
  //           fid: context.user.fid,
  //         }),
  //       });

  //       if (response.ok) {
  //         const result = await response.json();
  //         console.log('FID updated successfully:', result);
  //       } else {
  //         console.error('Failed to update FID:', await response.text());
  //       }
  //     }
  //   } catch (error) {
  //     console.error('Error updating user FID:', error);
  //   }
  // };

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

      // if (session) {
        handleUserDetails();
        
        // Check and update FID if conditions are met
      //   if (session && address && context?.user) {
      //     await updateUserFid();
      //   }
      // }
    })();
  }, [context, address]);

  return (
    <GlobalContext.Provider
      value={{
        user,
        authenticatedUser,
        isAuthenticated: !!authenticatedUser,
        isDesktopWallet
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
