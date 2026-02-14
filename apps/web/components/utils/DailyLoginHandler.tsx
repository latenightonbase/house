"use client";

import { useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useXPNotification } from "@/utils/providers/xpNotificationContext";

/**
 * Component that handles daily login XP award and shows the XP animation.
 * This needs to be placed inside both GlobalProvider and XPNotificationProvider.
 */
export default function DailyLoginHandler() {
  const { authenticated, user: privyUser, getAccessToken } = usePrivy();
  const { showXPGain, triggerRefresh } = useXPNotification();
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    const checkDailyLogin = async () => {
      // Only check once per session and when authenticated
      if (!authenticated || !privyUser || hasCheckedRef.current) {
        return;
      }
      
      hasCheckedRef.current = true;

      try {
        const accessToken = await getAccessToken();
        const response = await fetch('/api/protected/user/daily-login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.awarded && result.xp) {
            console.log(`Daily login XP awarded: ${result.xp} XP`);
            // Show XP animation
            showXPGain(result.xp, 'DAILY_LOGIN');
            // Trigger a refresh of XP stats in the navbar
            triggerRefresh();
          }
        }
      } catch (error) {
        // Silently fail - don't disrupt user experience
        console.error('Failed to check daily login:', error);
      }
    };
    
    checkDailyLogin();
  }, [authenticated, privyUser, getAccessToken, showXPGain, triggerRefresh]);

  // This component doesn't render anything visible
  return null;
}
