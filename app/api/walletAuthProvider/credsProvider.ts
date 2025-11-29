import CredentialsProvider from "next-auth/providers/credentials";
import { ethers } from "ethers";
import connectToDB from "@/utils/db";
import User from "@/utils/schemas/User";

// --- EIP-1271 constants and helper ABI ---
const EIP1271_MAGICVALUE = "0x1626ba7e";
const EIP1271_ABI = [
  "function isValidSignature(bytes32 _hash, bytes _signature) public view returns (bytes4 magicValue)"
];

// --- Verify smart contract signature via EIP-1271 ---
async function verifySmartContractSignature(
  address: string,
  message: string,
  signature: string,
  provider: any
) {
  try {
    const contract = new ethers.Contract(address, EIP1271_ABI, provider);
    const messageHash = ethers.hashMessage(message);
    const result = await contract.isValidSignature(messageHash, signature);
    const isValid = result?.toLowerCase() === EIP1271_MAGICVALUE;
    console.log(
      `EIP-1271 check for ${address}:`,
      isValid ? "✅ valid" : "❌ invalid"
    );
    return isValid;
  } catch (err) {
    console.error("EIP-1271 verification failed:", err);
    return false;
  }
}

// --- Verify any Ethereum signature (EOA or SCW) ---
async function verifySignature(
  message: string,
  signature: string,
  address: string
): Promise<string | null> {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

  try {
    // Detect contract account
    const code = await provider.getCode(address);
    const isContract = code && code !== "0x";
    console.log(`Address ${address} is ${isContract ? "a contract" : "an EOA"}.`);

    if (isContract) {
      console.log("Verifying via EIP-1271...");
      const valid = await verifySmartContractSignature(
        address,
        message,
        signature,
        provider
      );
      return valid ? address : null;
    }

    // EOA path (standard recover)
    console.log("Verifying EOA signature...");
    const recoveredAddress = ethers.verifyMessage(message, signature);
    console.log("Recovered address:", recoveredAddress);
    return recoveredAddress;
  } catch (error) {
    console.error("Error verifying signature:", error);
    return null;
  }
}

// --- Main NextAuth provider definition ---
export const walletAuthProvider = CredentialsProvider({
  name: "Ethereum",
  credentials: {
    message: { label: "Message", type: "text" },
    signature: { label: "Signature", type: "text" },
    address: { label: "Address", type: "text", optional: true },
  },

  async authorize(credentials) {
    console.log("Authorizing wallet user...");
    console.log("Credentials received:", credentials);

    if (!credentials?.message || !credentials?.signature) {
      console.error("Missing message or signature in credentials.");
      return null;
    }

    // Attempt to verify signature (supports EOA + SCW)
    const recoveredAddress = await verifySignature(
      credentials.message,
      credentials.signature,
      credentials.address
    );

    // Try extracting address from SIWE message
    let messageAddress: string | null = null;
    const addressMatch = credentials.message.match(/0x[a-fA-F0-9]{40}/);
    if (addressMatch) {
      messageAddress = addressMatch[0];
      console.log("Extracted address from SIWE message:", messageAddress);
    }

    // Pick final usable address
    const finalAddress =
      credentials.address || recoveredAddress || messageAddress;

    if (!finalAddress) {
      console.error("Could not determine wallet address from any source.");
      return null;
    }

    console.log("Using final address:", finalAddress);

    // Verify consistency if both recovered + provided exist
    if (
      recoveredAddress &&
      recoveredAddress.toLowerCase() !== finalAddress.toLowerCase()
    ) {
      console.error("Address mismatch between signature and provided address");
      return null;
    }

    // Connect to DB and find/create user
    try {
      await connectToDB();
      console.log("Connected to MongoDB.");
    } catch (err) {
      console.error("Database connection error:", err);
      return null;
    }

    let user = await User.findOne({ wallet: finalAddress });
    console.log("User lookup result:", user);

    if (!user) {
      console.log("User not found. Creating new user...");
      try {
        user = await User.create({
          wallet: finalAddress,
          token: `none-${Date.now()}`,
          fid: `none-${Date.now()}`,
        });
        console.log("New user created:", user);
      } catch (err) {
        console.error("Error creating user:", err);
        return null;
      }
    }

    // Return user session object
    return {
      id: user._id.toString(),
      address: finalAddress,
    };
  },
});
