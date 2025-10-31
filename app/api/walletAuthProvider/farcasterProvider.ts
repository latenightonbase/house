import CredentialsProvider from "next-auth/providers/credentials";
import connectToDB from "@/utils/db";
import User from "@/utils/schemas/User";

export const farcasterAuthProvider = CredentialsProvider({
  name: "Farcaster",
  credentials: {
    fid: { label: "FID", type: "text" },
    username: { label: "Username", type: "text" },
    pfpUrl: { label: "Profile Picture", type: "text" },
    bio: { label: "Bio", type: "text" },
    verifications: { label: "Verifications", type: "text" },
  },

  async authorize(credentials) {
    console.log("Authorizing Farcaster user...");
    console.log("Credentials received:", credentials);

    if (!credentials?.fid) {
      console.error("Missing FID in credentials.");
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

    let user = await User.findOne({ fid: credentials.fid });
    console.log("User lookup result:", user);

    if (!user) {
      console.log("User not found. Creating new user...");
      try {
        // Extract wallet address from verifications if available
        let walletAddress = null;
        if (credentials.verifications) {
          try {
            const verifications = JSON.parse(credentials.verifications);
            walletAddress = verifications[0] || null;
          } catch (e) {
            console.log("Could not parse verifications");
          }
        }

        user = await User.create({
          fid: credentials.fid,
          username: credentials.username || `user-${credentials.fid}`,
          pfp_url: credentials.pfpUrl || "",
          bio: credentials.bio || "",
          wallet: walletAddress || `farcaster-${credentials.fid}`,
          token: `farcaster-${Date.now()}`,
        });
        console.log("New user created:", user);
      } catch (err) {
        console.error("Error creating user:", err);
        return null;
      }
    } else {
      // Update existing user info
      user.username = credentials.username || user.username;
      user.pfp_url = credentials.pfpUrl || user.pfp_url;
      user.bio = credentials.bio || user.bio;
      await user.save();
    }

    // Return user session object
    return {
      id: user._id.toString(),
      fid: credentials.fid,
      username: credentials.username,
      pfpUrl: credentials.pfpUrl,
      bio: credentials.bio,
    };
  },
});