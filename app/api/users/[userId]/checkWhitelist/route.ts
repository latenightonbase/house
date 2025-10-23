import User from "@/utils/schemas/User";

export async function GET(request: Request, { params }: { params: { userId: string } }) {
  try {
    const userId = params.userId;
    // Fetch user from database
    const user = await User.findById(userId);
    if (!user) {
      return new Response("User not found", { status: 404 });
    }
    // Check if user is whitelisted
    return new Response(JSON.stringify({ whitelisted: user.whitelisted || false }), { status: 200 });
  } catch (error) {
    console.error("Error checking whitelist:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
