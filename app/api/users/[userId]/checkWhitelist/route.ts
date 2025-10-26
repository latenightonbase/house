import User from "@/utils/schemas/User";

export async function GET(request: Request) {
  try {
    const address = request.url.split("/")[5];
    console.log("Checking whitelist for address:", address);
    // Fetch user from database
    const user = await User.findOne({ wallet: address });
    
  
    if (!user) {
      return new Response(JSON.stringify({error:"User not found"}), { status: 404 });
    }
    // Check if user is whitelisted
    return new Response(JSON.stringify({ whitelisted: user.whitelisted || false }), { status: 200 });
  } catch (error) {
    console.error("Error checking whitelist:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
