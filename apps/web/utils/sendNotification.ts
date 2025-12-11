import connectToDB from "./db";
import User from "./schemas/User";

interface SendNotificationRequest {
  notificationId: string;
  title: string;
  body: string;
  targetUrl: string;
  tokens: string[];
}

interface SendNotificationResponse {
  result: {
    successfulTokens: string[];
    invalidTokens: string[];
    rateLimitedTokens: string[];
  };
}

export type SendMiniAppNotificationResult =
  | { state: "success" }
  | { state: "no_token" }
  | { state: "rate_limit" }
  | { state: "error"; error: any };

/**
 * Send a push notification to a user via MiniApp
 * @param fid - The user's Farcaster ID
 * @param title - Notification title (max 32 characters)
 * @param body - Notification body (max 128 characters)
 * @param targetUrl - URL to open when notification is clicked (optional, defaults to miniapp home)
 * @returns Result of the notification send attempt
 */
export async function sendMiniAppNotification({
  fid,
  title,
  body,
  targetUrl,
}: {
  fid: string;
  title: string;
  body: string;
  targetUrl?: string;
}): Promise<SendMiniAppNotificationResult> {
  try {
    // Validate input lengths
    if (title.length > 32) {
      return { 
        state: "error", 
        error: "Title exceeds 32 character limit" 
      };
    }
    if (body.length > 128) {
      return { 
        state: "error", 
        error: "Body exceeds 128 character limit" 
      };
    }

    // Connect to database and fetch user
    await connectToDB();
    const user = await User.findOne({ fid });

    if (!user || !user.notificationDetails) {
      return { state: "no_token" };
    }

    const { url, token } = user.notificationDetails;

    // Use provided targetUrl or default to miniapp home
    const finalTargetUrl = targetUrl || process.env.NEXT_PUBLIC_MINIAPP_URL || "";

    // Send notification
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notificationId: crypto.randomUUID(),
        title,
        body,
        targetUrl: finalTargetUrl,
        tokens: [token],
      } satisfies SendNotificationRequest),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { state: "error", error: errorData };
    }

    const responseData = (await response.json()) as SendNotificationResponse;

    // Check for rate limiting
    if (responseData.result.rateLimitedTokens.length > 0) {
      return { state: "rate_limit" };
    }

    // Check for invalid tokens
    if (responseData.result.invalidTokens.length > 0) {
      // Remove invalid token from database
      await User.findOneAndUpdate(
        { fid },
        { $unset: { notificationDetails: "" } }
      );
      return { state: "no_token" };
    }

    return { state: "success" };
  } catch (error) {
    console.error("Error sending notification:", error);
    return { state: "error", error };
  }
}

/**
 * Send notifications to multiple users
 * @param notifications - Array of notification objects with fid, title, body, targetUrl
 * @returns Array of results for each notification
 */
export async function sendBulkMiniAppNotifications(
  notifications: Array<{
    fid: string;
    title: string;
    body: string;
    targetUrl?: string;
  }>
): Promise<SendMiniAppNotificationResult[]> {
  const results = await Promise.allSettled(
    notifications.map((notification) => sendMiniAppNotification(notification))
  );

  return results.map((result) => {
    if (result.status === "fulfilled") {
      return result.value;
    } else {
      return { state: "error", error: result.reason };
    }
  });
}
