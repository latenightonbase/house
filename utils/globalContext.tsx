import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useMiniKit, useAuthenticate } from "@coinbase/onchainkit/minikit";
import { generateNonce } from "@farcaster/auth-client";
interface GlobalContextProps {
  user: any;
  authenticatedUser: any;
  isAuthenticated: boolean;
}

// Create a context with a default value matching the expected structure
const GlobalContext = createContext<GlobalContextProps | null>(null);

export const GlobalProvider = ({ children }: { children: React.ReactNode }) => {
  const { context } = useMiniKit();
  const { signIn } = useAuthenticate();
  const [user, setUser] = useState<any | null>(null);
  const [authenticatedUser, setAuthenticatedUser] = useState<any | null>(null);

  const getNonce = useCallback(async (): Promise<string> => {
    try {
      const nonce = await generateNonce();
      if (!nonce) throw new Error("Unable to generate nonce");
      return nonce;
    } catch (error) {
      console.error("Error in getNonce:", error);
      throw error;
    }
  }, []);

  const handleSignIn = useCallback(async (): Promise<void> => {
    console.log("handleSignIn called", new Date().toISOString());
    try {
      const env = process.env.NEXT_PUBLIC_ENV;
      var token:any ;
      if (env !== "DEV" && !token) {
        const nonce = await getNonce();

        await sdk.actions.signIn({ nonce });

        token = ((await sdk.quickAuth.getToken()).token);
      }

      const createUserRes = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/users/protected/handle`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const resJson = await createUserRes.json();

      if (!createUserRes.ok) {
        console.error("Failed to create user:", resJson.data);
      }
      
      const localUser = resJson.data.user;
      setUser(localUser);

    } catch (error) {
      console.error("Sign in error:", error);
    }
  }, [getNonce]);

  // const handleLocalUser = async (): Promise<void> => {
  //   if (user) return;
  //   try {
      
  //     if (context?.user) {
  //       // Set user data from context but ensure authentication is verified
  //       const userData = {
  //         username: context.user.displayName,
  //         pfp_url: context.user.pfpUrl,
  //         fid: context.user.fid,
  //       };
  //       setUser(userData);
  //     }
  //   } catch (error) {
  //     console.error("Sign in error:", error);
  //   }
  // };

  useEffect(() => {
    (async () => {
      // Only proceed if we have context user but haven't authenticated yet
      // if (context?.user && !user) {
      //   await handleLocalUser();
      // }

      if (process.env.NEXT_PUBLIC_ENV !== "DEV") {
        sdk.actions.ready();
      }

      if(sessionStorage?.getItem('authenticatedUser')) {
        setAuthenticatedUser(JSON.parse(sessionStorage.getItem('authenticatedUser')!));
      }
      else{
        await handleSignIn();
      }

    })();
  }, [context, user]);

  return (
    <GlobalContext.Provider value={{
      user,
      authenticatedUser,
      isAuthenticated: !!authenticatedUser
    }}>
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
