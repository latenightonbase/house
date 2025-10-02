import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useMiniKit } from "@coinbase/onchainkit/minikit";

// Create a context with a default value matching the expected structure
const GlobalContext = createContext<{ user: any | null } | null>(null);

export const GlobalProvider = ({ children }: { children: React.ReactNode }) => {
  const { context } = useMiniKit();
  const [user, setUser] = useState<any | null>(null);

  const handleSignIn = async (): Promise<void> => {
    if (user) return;
    try {
      const user = {
        username: context?.user.displayName,
        pfp_url: context?.user.pfpUrl,
        fid: context?.user.fid,
      };
      setUser(user);
    } catch (error) {
      console.error("Sign in error:", error);
    }
  };

  useEffect(() => {
   
    (async () => {
      if(context?.user)
      await handleSignIn();

      if (process.env.NEXT_PUBLIC_ENV !== "DEV") {
        sdk.actions.ready();
      }
    })();

  }, [context]);

  return (
    <GlobalContext.Provider value={{ user }}>{children}</GlobalContext.Provider>
  );
};

export const useGlobalContext = () => useContext(GlobalContext);
