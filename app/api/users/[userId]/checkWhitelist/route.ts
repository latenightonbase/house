import User from "@/utils/schemas/User";
import { isWhitelisted } from "@/utils/whitelist";

export async function GET(request: Request) {
  try {
    const address = request.url.split("/")[5];
    console.log("Checking whitelist for address:", address);
    
    // Check whitelist directly using the function
    const whitelisted = isWhitelisted(address);
    console.log("Whitelist result:", whitelisted);
    
    // Also check if user exists in database
    const user = await User.findOne({ wallet: address });
    
    if (!user) {
      console.log("User not found in database, but whitelist check:", whitelisted);
      return new Response(JSON.stringify({ whitelisted }), { status: 200 });
    }
    
    // Return the direct whitelist check result
    return new Response(JSON.stringify({ whitelisted }), { status: 200 });
  } catch (error) {
    console.error("Error checking whitelist:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
