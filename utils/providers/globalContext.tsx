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
}

// Create a context with a default value matching the expected structure
const GlobalContext = createContext<GlobalContextProps | null>(null);

export const GlobalProvider = ({ children }: { children: React.ReactNode }) => {
  const { context } = useMiniKit();
  const [user, setUser] = useState<any | null>(null);

  const {ready, authenticated, user:privyUser} = usePrivy();
  const {initLoginToMiniApp, loginToMiniApp} = useLoginToMiniApp();


  useEffect(() => {
  if (ready && !authenticated) {
    const login = async () => {
      // Initialize a new login attempt to get a nonce for the Farcaster wallet to sign
      const { nonce } = await initLoginToMiniApp();
      // Request a signature from Farcaster
      const result = await sdk.actions.signIn({nonce});
      // Send the received signature from Farcaster to Privy for authentication
      // or pass a SIWF message signed by an auth address
      await loginToMiniApp({
        message: result.message,
        signature: result.signature,
      });
    };
    login();
  }
}, [ready, authenticated]);

useEffect(() => {
  if(context){
    setUser({
      socialId: context.user?.fid,
      username: context.user?.username,
      pfp_url: context.user?.pfpUrl
    })
  }
  else if(!context && privyUser){
    console.log('Setting user from Privy:', privyUser);
    setUser({
      socialId: privyUser?.twitter?.subject,
      username: privyUser?.twitter?.username,
      pfp_url: privyUser?.twitter?.profilePictureUrl
    })
  }
},[context, privyUser])

  // Check if user is using desktop wallet (no MiniKit context)
  // const isDesktopWallet = !context?.client;

  // const authenticateWithTwitter = async (): Promise<void> => {
  //   try {
  //     await login();
  //   } catch (error) {
  //     console.error('Twitter authentication error:', error);
  //     toast.error('Failed to authenticate with Twitter');
  //   }
  // };


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

  useEffect(() => {
    (async () => {
      if (process.env.NEXT_PUBLIC_ENV !== "DEV") {
        sdk.actions.ready();
      }
    })();
  }, []);

  return (
    <GlobalContext.Provider
      value={{
        user
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
