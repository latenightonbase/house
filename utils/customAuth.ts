import { signIn } from "next-auth/react";
import { usePrivy } from "@privy-io/react-auth";

export const useCustomFarcasterAuth = () => {
  const { authenticated, user: privyUser, login } = usePrivy();

  const customSignIn = async () => {
    try {
      if (!authenticated || !privyUser?.farcaster) {
        // Trigger Privy login first
        await login();
        return;
      }

      // Sign in with NextAuth using Farcaster data
      const result = await signIn("credentials", {
        fid: privyUser.farcaster.fid?.toString() || "",
        username: privyUser.farcaster.username || "",
        pfpUrl: privyUser.farcaster.pfp || "",
        bio: privyUser.farcaster.bio || "",
        verifications: JSON.stringify([]),
        redirect: false,
      });

      return result;
    } catch (error) {
      console.error("Custom Farcaster auth failed:", error);
      throw error;
    }
  };

  return { customSignIn, authenticated, user: privyUser };
};