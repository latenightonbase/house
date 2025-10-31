import { signIn } from "next-auth/react";
import { useAccount } from "wagmi";
import { SiweMessage } from "siwe";
import { useSignMessage } from "wagmi";

export const useCustomSiweAuth = () => {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const customSignIn = async () => {
    try {
      if (!address) {
        throw new Error("No wallet connected");
      }

      // Create SIWE message
      const message = new SiweMessage({
        domain: window.location.host,
        address: address,
        statement: "Sign in to Auction House",
        uri: window.location.origin,
        version: "1",
        chainId: 8453, // Base chain
        nonce: Math.random().toString(36).substring(2, 15),
        issuedAt: new Date().toISOString(),
      });

      // Sign the message
      const signature = await signMessageAsync({
        message: message.prepareMessage(),
      });

      // Sign in with NextAuth, passing the address explicitly
      const result = await signIn("credentials", {
        message: message.prepareMessage(),
        signature: signature,
        address: address, // Explicitly pass the address
        redirect: false,
      });

      return result;
    } catch (error) {
      console.error("Custom SIWE auth failed:", error);
      throw error;
    }
  };

  return { customSignIn };
};