import React, {
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useLoginToMiniApp } from "@privy-io/react-auth/farcaster";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import toast from "react-hot-toast";
import miniappSdk from '@farcaster/miniapp-sdk';

interface GlobalContextProps {
  user: any;
  authenticatedUser: any;
  isAuthenticated: boolean;
  isDesktopWallet: boolean;
  isFarcasterContext: boolean;
  hasTwitterProfile: boolean;
  authenticateWithTwitter: () => Promise<void>;
  refreshTwitterProfile: () => Promise<void>;
  connectWallet: () => Promise<void>;
}

// Create a context with a default value matching the expected structure
const GlobalContext = createContext<GlobalContextProps | null>(null);

export const GlobalProvider = ({ children }: { children: React.ReactNode }) => {
  const { context } = useMiniKit();
  const { ready, authenticated, login, logout, user: privyUser } = usePrivy();
  const { wallets } = useWallets();
  const { initLoginToMiniApp, loginToMiniApp } = useLoginToMiniApp();
  const [user, setUser] = useState<any | null>(null);
  const [hasTwitterProfile, setHasTwitterProfile] = useState<boolean>(false);

  // Check if user is in Farcaster/Base App context
  const isFarcasterContext = !!context?.client;
  // Check if user is using desktop wallet (no MiniKit context)
  const isDesktopWallet = !context?.client;

  // Get wallet address from Privy wallets
  const walletAddress = wallets[0]?.address;

  const authenticateWithTwitter = async (): Promise<void> => {
    try {
      // On browser, Twitter login is the first step
      await login();
      toast.success('Twitter connected! Now connect your wallet.');
    } catch (error) {
      console.error('Twitter authentication error:', error);
      toast.error('Failed to authenticate with Twitter');
    }
  };

  const connectWallet = async (): Promise<void> => {
    try {
      // After Twitter authentication, user connects wallet via Privy
      await login();
      toast.success('Wallet connected successfully!');
    } catch (error) {
      console.error('Wallet connection error:', error);
      toast.error('Failed to connect wallet');
    }
  };

  const refreshTwitterProfile = async (): Promise<void> => {
    await checkTwitterProfile();
  };

  const checkTwitterProfile = async () => {
    if (walletAddress) {
      try {
        const response = await fetch(`/api/users/${walletAddress}`);
        if (response.ok) {
          const userData = await response.json();
          const hasTwitter = !!userData.user?.twitterProfile?.id;
          setHasTwitterProfile(hasTwitter);
        }
      } catch (error) {
        console.error('Error checking Twitter profile:', error);
      }
    }
  };

  const updateUserFid = async () => {
    try {
      if (walletAddress && context?.user?.fid) {
        const response = await fetch('/api/protected/user/update-fid', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            wallet: walletAddress,
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
      let userData: any = null;

      // Check Farcaster account from Privy
      const farcasterAccount = privyUser?.linkedAccounts?.find(
        (account: any) => account.type === 'farcaster'
      ) as any;

      if (farcasterAccount) {
        // User has Farcaster - use Farcaster profile
        userData = {
          username: farcasterAccount.username || farcasterAccount.displayName || farcasterAccount.fid,
          pfp_url: farcasterAccount.pfp || farcasterAccount.pfpUrl,
          fid: farcasterAccount.fid,
        };
      } else if (walletAddress) {
        // Try to fetch user from database (single call combines both checks)
        try {
          const dbResponse = await fetch(`/api/users/${walletAddress}`);
          if (dbResponse.ok) {
            const dbUser = await dbResponse.json();
            if (dbUser.user && dbUser.user.username) {
              userData = {
                username: dbUser.user.username,
                pfp_url: dbUser.user.pfp_url || `https://api.dicebear.com/5.x/identicon/svg?seed=${walletAddress}`,
                fid: dbUser.user.fid || walletAddress,
                wallet: dbUser.user.wallet,
                notificationDetails: dbUser.user.notificationDetails,
              };
              // Set Twitter profile state from the same response
              setHasTwitterProfile(!!dbUser.user?.twitterProfile?.id);
            }
          }
        } catch (error) {
          console.error("Error fetching user from database:", error);
        }

        // Fallback to wallet address display
        if (!userData) {
          userData = {
            username: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
            pfp_url: `https://api.dicebear.com/5.x/identicon/svg?seed=${walletAddress}`,
            fid: walletAddress,
          };
        }
      }

      setUser(userData);
    } catch (error) {
      console.error("Error loading user details:", error);
    }
  };

  // Clear user state when Privy authentication is lost
  useEffect(() => {
    if (ready && !authenticated) {
      setUser(null);
      setHasTwitterProfile(false);
    }
  }, [ready, authenticated]);

  // Automatic Farcaster authentication for Mini Apps
  useEffect(() => {
    if (ready && !authenticated && isFarcasterContext) {
      const loginWithFarcaster = async () => {
        try {
          // Initialize a new login attempt to get a nonce for the Farcaster wallet to sign
          const { nonce } = await initLoginToMiniApp();
          
          // Request a signature from Farcaster
          const result = await miniappSdk.actions.signIn({ nonce });
          
          // Send the received signature from Farcaster to Privy for authentication
          await loginToMiniApp({
            message: result.message,
            signature: result.signature,
          });
          
          toast.success('Authenticated with Farcaster!');
        } catch (error) {
          console.error('Farcaster authentication error:', error);
          // Silently fail for automatic authentication
        }
      };
      
      loginWithFarcaster();
    }
  }, [ready, authenticated, isFarcasterContext, initLoginToMiniApp, loginToMiniApp]);

  useEffect(() => {
    (async () => {
      if (process.env.NEXT_PUBLIC_ENV !== "DEV") {
        sdk.actions.ready();
      }

      // Only handle user details if Privy is ready and authenticated
      if (ready && authenticated) {
        // handleUserDetails now combines both user fetch and Twitter check
        await handleUserDetails();
        
        // Check and update FID if conditions are met
        if (walletAddress && context?.user) {
          await updateUserFid();
        }
      }
    })();
  }, [context, walletAddress, ready, authenticated, privyUser]);

  return (
    <GlobalContext.Provider
      value={{
        user,
        authenticatedUser: privyUser,
        isAuthenticated: authenticated,
        isDesktopWallet,
        isFarcasterContext,
        hasTwitterProfile,
        authenticateWithTwitter,
        refreshTwitterProfile,
        connectWallet,
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
