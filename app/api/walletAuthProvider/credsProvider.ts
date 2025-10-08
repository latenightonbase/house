import CredentialsProvider from "next-auth/providers/credentials";

import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import connectToDB from "@/utils/db";
import User from "@/utils/schemas/User";

// Create a public client for Base network to verify signatures
const client = createPublicClient({ 
  chain: base, 
  transport: http() 
});

async function verifySignature(address: string, message: string, signature: string) {
    try {
      console.log("Verifying signature...");
      console.log("Address:", address);
      console.log("Message:", message);
      console.log("Signature:", signature);

      // Validate input format
      if (!address.startsWith('0x') || address.length !== 42) {
        console.error("Invalid address format");
        return null;
      }

      if (!signature.startsWith('0x')) {
        console.error("Invalid signature format");
        return null;
      }

      // Use Viem's verifyMessage which supports smart contract wallets
      // This includes ERC-6492 wrapper for undeployed smart wallets
      const isValid = await client.verifyMessage({ 
        address: address as `0x${string}`, 
        message, 
        signature: signature as `0x${string}`
      });
      
      console.log("Signature verification result:", isValid);
      
      if (!isValid) {
        console.error("Signature verification failed: signature does not match address");
        return null;
      }
      
      return address;
    } catch (error) {
      console.error('Error verifying signature:', error);
      
      // Provide more specific error information
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        
        // Handle specific Viem errors
        if (error.message.includes('Invalid signature')) {
          console.error('Invalid signature provided');
        } else if (error.message.includes('Invalid address')) {
          console.error('Invalid address provided');
        } else if (error.message.includes('network')) {
          console.error('Network error during verification');
        }
      }
      
      return null;
    }
  }

export const walletAuthProvider = CredentialsProvider({
  name: 'Ethereum',
  credentials: {
    message: { label: "Message", type: "text" },
    signature: { label: "Signature", type: "text" },
    address: { label: "Address", type: "text" },
  },
  async authorize(credentials) {
    console.log("Authorizing user...");
    console.log("Credentials received:", credentials);

    if (!credentials?.message || !credentials?.signature || !credentials?.address) {
      console.error("Missing message, signature, or address in credentials.");
      return null;
    }

    const verifiedAddress = await verifySignature(
      credentials.address, 
      credentials.message, 
      credentials.signature
    );

    if (!verifiedAddress) {
      console.error("Signature verification failed.");
      return null;
    }

    console.log("Signature verified. Address:", verifiedAddress);

    const message = credentials.message;
    console.log("Parsed message:", message);

    await connectToDB();
    console.log("Connected to database.");

    let user = await User.findOne({ wallet: verifiedAddress });
    console.log("User lookup result:", user);

    if (!user) {
      console.log("User not found. Creating new user...");
      try{
user = await User.create({
        wallet: verifiedAddress,
      });
      }
      catch(err){
        console.log("Error creating user:", err);
        return null;
      }
      
      console.log("New user created:", user);
    }

    return {
      id: user._id.toString(),
      address: verifiedAddress,
    };
  }
});