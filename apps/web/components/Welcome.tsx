"use client";

import { useGlobalContext } from "@/utils/providers/globalContext";
import { useNavigateWithLoader } from "@/utils/useNavigateWithLoader";
import { FaPlus } from "react-icons/fa";
import { IoMdNotifications } from "react-icons/io";
import { useCallback, useState, useEffect } from "react";
import sdk from "@farcaster/miniapp-sdk";
import { toast } from "react-hot-toast";
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
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { getAccessToken, useWallets } from '@privy-io/react-auth';
import PlatformStats from "@/components/utils/PlatformStats";

export default function Welcome() {

    const {user} = useGlobalContext();
    const navigate = useNavigateWithLoader();
    const [isAddingMiniApp, setIsAddingMiniApp] = useState(false);
    const {context} = useMiniKit();
    const {wallets} = useWallets();
    const address = wallets.length > 0 ? wallets[0].address : null;
    const [hasNotifications, setHasNotifications] = useState<boolean>(true);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [isDesktop, setIsDesktop] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(min-width: 1024px)');
        setIsDesktop(mediaQuery.matches);
        
        const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    // Check if user has already enabled notifications
    useEffect(() => {
        const checkNotifications = async () => {
            if(!context || !user?.socialId) {
                setHasNotifications(false);
                return;
            }

            try {
                const accessToken = await getAccessToken();
                
                const response = await fetch('/api/users/profile?socialId=' + user.socialId, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                });
                const data = await response.json();

                const hasNotifs = !!(data.user?.notificationDetails);
                setHasNotifications(hasNotifs);
                
                // Open drawer if user doesn't have notifications enabled
                if (!hasNotifs) {
                    setDrawerOpen(true);
                }
            } catch (error) {
                console.error("Error checking notifications:", error);
                setHasNotifications(false);
            }
        };

        if(user)
        checkNotifications();
    
    }, [context, user?.socialId]);

    const handleAddMiniApp = useCallback(async () => {
        setIsAddingMiniApp(true);
        try {
            const response = await sdk.actions.addMiniApp();
            
            if (response.notificationDetails) {
                console.log("MiniApp added with notification details:", response.notificationDetails);
                console.log("User wallet:", address);
                
                // Save notification details to user
                const saveResponse = await fetch('/api/miniapp/notifications/save', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        socialId: user.socialId,
                        notificationDetails: response.notificationDetails
                    })
                });

                const saveResult = await saveResponse.json();
                console.log("Save response:", saveResult);

                if (!saveResponse.ok) {
                    throw new Error(saveResult.error || "Failed to save notification details");
                }

                // Update the state to reflect notifications are now enabled
                setHasNotifications(true);
                
                toast.success("Notifications enabled and miniapp added successfully.", {
                    duration: 4000,
                });
                setDrawerOpen(false);
            }
            
        } catch (error: any) {
            console.error("Error adding MiniApp:", error);
            toast.error(error?.message || "Failed to enable notifications. Please try again.", {
                duration: 3000,
            });
        } finally {
            setIsAddingMiniApp(false);
        }
    }, [address]);

    
    return (
            <div className="w-full">
                <div className="card p-6 max-lg:p-4 space-y-5">
                    <div className="flex max-md:flex-col md:items-center justify-between gap-6">
                        <div className="space-y-3">
                            <span className="panel-label">The exchange for attention</span>
                            <h1 className="text-3xl max-lg:text-2xl font-bold tracking-tight">
                                <span className="gradient-text">Your House. Their Bids.</span>
                            </h1>
                            <div className="tile w-fit rounded-full px-3 py-1 text-xs flex items-center gap-1.5 text-caption">
                                Powered by
                                <a
                                    href="https://dexscreener.com/base/0x51f77b39db5b14605abb569647a9a33e733ab3e018e79325a44c07aadd927686"
                                    target="_blank"
                                    className="accent-text font-bold"
                                >
                                    $AUCTION
                                </a>
                            </div>
                        </div>

                        <button
                            onClick={() => { navigate('/create') }}
                            className="max-md:w-full md:w-56 shrink-0 px-6 py-3 gradient-button flex gap-2 items-center justify-center text-white rounded-lg transition-all font-semibold hover:-translate-y-0.5 duration-200"
                        >
                            <FaPlus/> Create Auction
                        </button>
                    </div>

                    <div className="border-t border-line pt-5">
                        <PlatformStats />
                    </div>
                </div>

                {hasNotifications === false && context && (
                    !isDesktop ? (
                        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
                                <DrawerContent>
                                    <DrawerHeader>
                                        <DrawerTitle className="text-center gradient-text text-2xl">
                                            Enable Notifications
                                        </DrawerTitle>
                                        <DrawerDescription className="text-center text-caption">
                                            Stay updated on your auctions
                                        </DrawerDescription>
                                    </DrawerHeader>
                                    <div className="p-6 space-y-4">
                                        <div className="flex items-start gap-3">
                                            <IoMdNotifications className="text-primary-light text-2xl flex-shrink-0 mt-1" />
                                            <div>
                                                <h3 className="font-semibold text-white mb-1">Get Real-time Updates</h3>
                                                <p className="text-sm text-caption">
                                                    Receive instant notifications when you're outbid, when your auction receives bids, or when you win an auction.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <FaPlus className="text-positive text-xl flex-shrink-0 mt-1" />
                                            <div>
                                                <h3 className="font-semibold text-white mb-1">Never Miss Out</h3>
                                                <p className="text-sm text-caption">
                                                    Be the first to know about important auction events and act quickly on opportunities.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <DrawerFooter>
                                        <button 
                                            onClick={handleAddMiniApp}
                                            disabled={isAddingMiniApp}
                                            className="w-full px-6 py-3 gradient-button flex gap-2 items-center justify-center text-white rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <IoMdNotifications className="text-xl"/> 
                                            {isAddingMiniApp ? "Enabling..." : "Enable Notifications"}
                                        </button>
                                        <DrawerClose asChild>
                                            <button className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-md transition">
                                                Maybe Later
                                            </button>
                                        </DrawerClose>
                                    </DrawerFooter>
                                </DrawerContent>
                            </Drawer>
                    ) : (
                        <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
                                <DialogContent className="sm:max-w-[500px]">
                                    <DialogHeader>
                                        <DialogTitle className="text-center gradient-text text-2xl">
                                            Enable Notifications
                                        </DialogTitle>
                                        <DialogDescription className="text-center text-caption">
                                            Stay updated on your auctions
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4 space-y-4">
                                        <div className="flex items-start gap-3">
                                            <IoMdNotifications className="text-primary-light text-2xl flex-shrink-0 mt-1" />
                                            <div>
                                                <h3 className="font-semibold text-white mb-1">Get Real-time Updates</h3>
                                                <p className="text-sm text-caption">
                                                    Receive instant notifications when you're outbid, when your auction receives bids, or when you win an auction.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <FaPlus className="text-positive text-xl flex-shrink-0 mt-1" />
                                            <div>
                                                <h3 className="font-semibold text-white mb-1">Never Miss Out</h3>
                                                <p className="text-sm text-caption">
                                                    Be the first to know about important auction events and act quickly on opportunities.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <DialogFooter className="flex-col gap-2">
                                        <button 
                                            onClick={handleAddMiniApp}
                                            disabled={isAddingMiniApp}
                                            className="w-full px-6 py-3 gradient-button flex gap-2 items-center justify-center text-white rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <IoMdNotifications className="text-xl"/> 
                                            {isAddingMiniApp ? "Enabling..." : "Enable Notifications"}
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
                    )
                )}
                
            </div>

    )
}