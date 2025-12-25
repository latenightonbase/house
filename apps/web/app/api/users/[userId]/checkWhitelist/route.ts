import dbConnect from "@/utils/db";
import Whitelist from "@/utils/schemas/Whitelist";

export async function GET(request: Request) {
  try {
    const address = request.url.split("/")[5];
    console.log("Checking whitelist for address:", address);
    
    await dbConnect();
    
    // Check whitelist from database
    const whitelistEntry = await Whitelist.findOne({ 
      walletAddress: address.toLowerCase(),
      status: 'ACTIVE'
    });
    
    const whitelisted = !!whitelistEntry;
    console.log("Whitelist result:", whitelisted);
    
    return new Response(JSON.stringify({ whitelisted }), { status: 200 });
  } catch (error) {
    console.error("Error checking whitelist:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
