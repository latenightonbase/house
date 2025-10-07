import React, {
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { usePrivy } from "@privy-io/react-auth";
import { useLoginToMiniApp } from "@privy-io/react-auth/farcaster";

interface GlobalContextProps {
  user: any;
  authenticatedUser: any;
  isAuthenticated: boolean;
}

// Create a context with a default value matching the expected structure
const GlobalContext = createContext<GlobalContextProps | null>(null);

export const GlobalProvider = ({ children }: { children: React.ReactNode }) => {
  const { ready, authenticated, user: privyUser } = usePrivy();
  const { initLoginToMiniApp, loginToMiniApp } = useLoginToMiniApp();
  const [user, setUser] = useState<any | null>(null);
  const [authenticatedUser, setAuthenticatedUser] = useState<any | null>(null);

  useEffect(() => {
    const login = async () => {
      try {
        if (ready && !authenticated) {
          // Initialize a new login attempt to get a nonce for the Farcaster wallet to sign
          const { nonce } = await initLoginToMiniApp();

          // Request a signature from Farcaster
          const result = await sdk.actions.signIn({ nonce });

          // Send the received signature from Farcaster to Privy for authentication
          await loginToMiniApp({
            message: result.message,
            signature: result.signature,
          });
        }

        // Set the authenticated user from Privy
        if (authenticated && privyUser) {
          setAuthenticatedUser(privyUser);
          setUser(privyUser.farcaster);
        }
      } catch (error) {
        console.error("Authentication error:", error);
      }
    };

    login();
  }, [ready, authenticated, privyUser, initLoginToMiniApp, loginToMiniApp]);

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
