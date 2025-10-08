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
  },
  async authorize(credentials) {
    console.log("Authorizing user...");
    console.log("Credentials received:", credentials);

    if (!credentials?.message || !credentials?.signature) {
      console.error("Missing message or signature in credentials.");
      return null;
    }

    const address = verifySignature(credentials.message, credentials.signature);

    if (!address) {
      console.error("Signature verification failed.");
      return null;
    }

    console.log("Signature verified. Address:", address);

    const message = credentials.message;
    console.log("Parsed message:", message);

    await connectToDB();
    console.log("Connected to database.");

    let user = await User.findOne({ wallet: address });
    console.log("User lookup result:", user);

    if (!user) {
      console.log("User not found. Creating new user...");
      try{
user = await User.create({
        wallet: address,
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
      address: address,
    };
  }
});