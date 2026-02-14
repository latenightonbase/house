"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";

export type XPAction =
  | "CREATE_AUCTION"
  | "BID"
  | "WIN_AUCTION"
  | "LEAVE_REVIEW"
  | "DAILY_LOGIN";

export interface XPNotification {
  id: string;
  amount: number;
  action: XPAction;
  timestamp: number;
}

interface XPNotificationContextProps {
  // Trigger XP gain animation
  showXPGain: (amount: number, action: XPAction) => void;
  // Current active notifications (for rendering particles)
  activeNotifications: XPNotification[];
  // Remove a notification after animation completes
  removeNotification: (id: string) => void;
  // XP stats for the progress bar
  xpStats: XPStats | null;
  // Update XP stats (called after XP is awarded)
  updateXPStats: (newStats: Partial<XPStats>) => void;
  // Set full XP stats (called on initial load)
  setXPStats: (stats: XPStats | null) => void;
  // Trigger a refetch of XP stats
  triggerRefresh: () => void;
  // Refresh counter (components can watch this to know when to refetch)
  refreshCounter: number;
}

export interface XPStats {
  level: number;
  currentSeasonXP: number;
  totalXP: number;
  xpToNextLevel: number;
}

const XPNotificationContext = createContext<XPNotificationContextProps | null>(null);

// Action labels for display
export const XP_ACTION_LABELS: Record<XPAction, string> = {
  CREATE_AUCTION: "Auction Created",
  BID: "Bid Placed",
  WIN_AUCTION: "Auction Won",
  LEAVE_REVIEW: "Review Left",
  DAILY_LOGIN: "Daily Login",
};

export const XPNotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeNotifications, setActiveNotifications] = useState<XPNotification[]>([]);
  const [xpStats, setXPStatsState] = useState<XPStats | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const notificationIdRef = useRef(0);

  const showXPGain = useCallback((amount: number, action: XPAction) => {
    if (amount <= 0) return;

    const id = `xp-${Date.now()}-${notificationIdRef.current++}`;
    const notification: XPNotification = {
      id,
      amount,
      action,
      timestamp: Date.now(),
    };

    setActiveNotifications((prev) => [...prev, notification]);

    // Auto-remove after animation duration (3 seconds)
    setTimeout(() => {
      setActiveNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 3000);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setActiveNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const updateXPStats = useCallback((newStats: Partial<XPStats>) => {
    setXPStatsState((prev) => {
      if (!prev) return null;
      return { ...prev, ...newStats };
    });
  }, []);

  const setXPStats = useCallback((stats: XPStats | null) => {
    setXPStatsState(stats);
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshCounter((prev) => prev + 1);
  }, []);

  return (
    <XPNotificationContext.Provider
      value={{
        showXPGain,
        activeNotifications,
        removeNotification,
        xpStats,
        updateXPStats,
        setXPStats,
        triggerRefresh,
        refreshCounter,
      }}
    >
      {children}
    </XPNotificationContext.Provider>
  );
};

export function useXPNotification() {
  const context = useContext(XPNotificationContext);
  if (!context) {
    throw new Error("useXPNotification must be used within an XPNotificationProvider");
  }
  return context;
}
