"use client";

import { useEffect, useState, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useXPNotification } from "@/utils/providers/xpNotificationContext";
import { FaStar, FaGift } from "react-icons/fa";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/UI/Drawer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/UI/Dialog";

export default function DailyLoginClaimDrawer() {
  const { authenticated, getAccessToken } = usePrivy();
  const { showXPGain, triggerRefresh } = useXPNotification();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [xpAmount, setXpAmount] = useState(5);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const checkDailyLogin = async () => {
      if (!authenticated || hasCheckedRef.current) {
        return;
      }

      hasCheckedRef.current = true;

      try {
        const accessToken = await getAccessToken();
        const response = await fetch("/api/protected/user/daily-login", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.canClaim) {
            setXpAmount(result.xpAmount || 5);
            setDrawerOpen(true);
          }
        }
      } catch (error) {
        console.error("Failed to check daily login:", error);
      }
    };

    checkDailyLogin();
  }, [authenticated, getAccessToken]);

  const handleClaim = async () => {
    setIsClaiming(true);
    try {
      const accessToken = await getAccessToken();
      const response = await fetch("/api/protected/user/daily-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.awarded && result.xp) {
          showXPGain(result.xp, "DAILY_LOGIN");
          triggerRefresh();
        }
      }
    } catch (error) {
      console.error("Failed to claim daily login XP:", error);
    } finally {
      setIsClaiming(false);
      setDrawerOpen(false);
    }
  };

  const content = (
    <>
      <div className="p-6 space-y-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center animate-pulse">
            <FaGift className="text-4xl text-white" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-white text-xl mb-2">
              Daily Reward Available!
            </h3>
            <p className="text-caption">
              Claim your daily login bonus
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
            <FaStar className="text-warning" />
            <span className="text-white font-bold text-lg">+{xpAmount} XP</span>
          </div>
        </div>
      </div>
    </>
  );

  if (!authenticated) return null;

  return isDesktop ? (
    <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-center gradient-text text-2xl">
            Welcome Back!
          </DialogTitle>
          
        </DialogHeader>
        {content}
        <DialogFooter className="flex-col gap-2">
          <button
            onClick={handleClaim}
            disabled={isClaiming}
            className="w-full px-6 py-3 gradient-button flex gap-2 items-center justify-center text-white rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaGift className="text-xl" />
            {isClaiming ? "Claiming..." : "Claim"}
          </button>
          <button
            onClick={() => setDrawerOpen(false)}
            className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-md transition"
          >
            Maybe Later
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ) : (
    <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-center gradient-text text-2xl">
            Welcome Back!
          </DrawerTitle>
          
        </DrawerHeader>
        {content}
        <DrawerFooter>
          <button
            onClick={handleClaim}
            disabled={isClaiming}
            className="w-full px-6 py-3 gradient-button flex gap-2 items-center justify-center text-white rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaGift className="text-xl" />
            {isClaiming ? "Claiming..." : "Claim"}
          </button>
          <DrawerClose asChild>
            <button className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-md transition">
              Maybe Later
            </button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
