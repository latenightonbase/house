import CredentialsProvider from "next-auth/providers/credentials";

import { ethers } from "ethers";
import connectToDB from "@/utils/db";
import User from "@/utils/schemas/User";

function verifySignature(message:any, signature:any) {
    try {
      console.log("Verifying signature...");
      console.log("Message:", message);
      console.log("Signature:", signature);

      const address = ethers.utils.verifyMessage(message, signature);
      console.log("Recovered address:", address);
      return address;
    } catch (error) {
      console.error('Error verifying signature:', error);
      return null;
    }
  }

export const walletAuthProvider = CredentialsProvider({
  name: 'Ethereum',
  credentials: {
    message: { label: "Message", type: "text" },
    signature: { label: "Signature", type: "text" },
    address: { label: "Address", type: "text", optional: true },
  },
  async authorize(credentials) {
    console.log("Authorizing user...");
    console.log("Wallet auth provider called", credentials?.address);
    console.log("Credentials received:", credentials);

    if (!credentials?.message || !credentials?.signature) {
      console.error("Missing message or signature in credentials.");
      return null;
    }

    // First try to get address from message signature verification
    const recoveredAddress = verifySignature(credentials.message, credentials.signature);
    
    // Also try to extract address from SIWE message format
    let messageAddress = null;
    const addressMatch = credentials.message.match(/0x[a-fA-F0-9]{40}/);
    if (addressMatch) {
      messageAddress = addressMatch[0];
      console.log("Extracted address from SIWE message:", messageAddress);
    }

    // Use provided address, recovered address, or extracted address
    const finalAddress = credentials.address || recoveredAddress || messageAddress;

    if (!finalAddress) {
      console.error("Could not determine wallet address from any source.");
      return null;
    }

    console.log("Using final address:", finalAddress);

    // Verify that the signature matches if we have both recovered and provided addresses
    if (recoveredAddress && recoveredAddress.toLowerCase() !== finalAddress.toLowerCase()) {
      console.error("Address mismatch between signature and provided address");
      return null;
    }

    const message = credentials.message;
    console.log("Parsed message:", message);
    console.log("Final address to use:", finalAddress);
    await connectToDB();
    console.log("Connected to database.");

    let user = await User.findOne({ wallet: finalAddress });
    console.log("User lookup result:", user);

    if (!user) {
      console.log("User not found. Creating new user...");
      try{
user = await User.create({
        wallet: finalAddress,
        token: `none-${Date.now()}`,
        fid: `none-${Date.now()}`
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
      address: finalAddress,
    };
  }
});