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
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { getAccessToken, useWallets } from '@privy-io/react-auth';

type PastAuction = {
    _id: string;
    auctionName: string;
    currency: string;
    highestBid: number;
    endDate: string;
    blockchainAuctionId: string;
    hostedBy?: {
        display_name?: string;
        username?: string;
    };
};

export default function Welcome() {

    const {user} = useGlobalContext();
    const navigate = useNavigateWithLoader();
    const [isAddingMiniApp, setIsAddingMiniApp] = useState(false);
    const {context} = useMiniKit();
    const {wallets} = useWallets();
    const address = wallets.length > 0 ? wallets[0].address : null;
    const [hasNotifications, setHasNotifications] = useState<boolean | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [pastDrawerOpen, setPastDrawerOpen] = useState(false);
    const [pastAuctions, setPastAuctions] = useState<any[]>([]);
    const [pastLoading, setPastLoading] = useState(false);
    const [pastError, setPastError] = useState<string | null>(null);

    const fetchPastAuctions = useCallback(async () => {
        try {
            setPastLoading(true);
            setPastError(null);
            const response = await fetch('/api/auctions/getEnded?limit=5');
            const data = await response.json();

            if (data.success) {
                setPastAuctions(data.auctions || []);
            } else {
                setPastError(data.message || data.error || 'Failed to load past auctions');
            }
        } catch (error) {
            console.error('Error fetching past auctions:', error);
            setPastError('Network error: Unable to load past auctions');
        } finally {
            setPastLoading(false);
        }
    }, []);

    useEffect(() => {
        if (pastDrawerOpen) {
            fetchPastAuctions();
        }
    }, [pastDrawerOpen, fetchPastAuctions]);

    const formatEndedLabel = (endDate: string) => {
        const end = new Date(endDate);
        const diffMs = Date.now() - end.getTime();
        if (diffMs < 3600_000) return 'Just ended';
        const diffHours = Math.floor(diffMs / 3600_000);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays}d ago`;
        const diffWeeks = Math.floor(diffDays / 7);
        return `${diffWeeks}w ago`;
    };

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
            <div className="space-y-4 flex flex-col  max-lg:justify-center w-full">
                <div className="text-left text-caption flex flex-col font-semibold text-xl gap-2 mb-4">
                    Welcome to <span className="gradient-text text-3xl block font-bold">The House!</span>
                </div>
                <div className="bg-white/10 w-fit rounded-full px-2 py-1 text-xs flex items-center justify-center gap-1 text-white">Powered by <a href="https://dexscreener.com/base/0x51f77b39db5b14605abb569647a9a33e733ab3e018e79325a44c07aadd927686" target="_blank" className="gradient-text font-bold">$AUCTION</a></div>

                <div className="flex flex-wrap gap-3">
                    <button onClick={()=>{navigate('/create')}} className= "max-lg:w-full w-80 px-6 py-3 hover:-translate-y-1 duration-200 gradient-button flex gap-2 items-center justify-center text-white rounded-md hover:bg-green-700 transition">
                        <FaPlus/> Create Auction
                    </button>
                    <button
                        onClick={() => setPastDrawerOpen(true)}
                        className="max-lg:w-full w-64 px-6 py-3 border border-white/20 text-white rounded-md hover:border-white/40 hover:bg-white/10 transition"
                    >
                        View Past Auctions
                    </button>
                </div>

                {hasNotifications === false && context && (
                    <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
                        <DrawerContent>
                            <DrawerHeader>
                                <DrawerTitle className="text-center gradient-text text-2xl">
                                    Enable Notifications
                                </DrawerTitle>
                                <DrawerDescription className="text-center text-white/70">
                                    Stay updated on your auctions
                                </DrawerDescription>
                            </DrawerHeader>
                            <div className="p-6 space-y-4">
                                <div className="flex items-start gap-3">
                                    <IoMdNotifications className="text-blue-500 text-2xl flex-shrink-0 mt-1" />
                                    <div>
                                        <h3 className="font-semibold text-white mb-1">Get Real-time Updates</h3>
                                        <p className="text-sm text-white/70">
                                            Receive instant notifications when you're outbid, when your auction receives bids, or when you win an auction.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <FaPlus className="text-green-500 text-xl flex-shrink-0 mt-1" />
                                    <div>
                                        <h3 className="font-semibold text-white mb-1">Never Miss Out</h3>
                                        <p className="text-sm text-white/70">
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
                )}

                {pastDrawerOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
                        <div
                            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                            onClick={() => setPastDrawerOpen(false)}
                        />
                        <div className="relative z-50 w-full max-w-3xl bg-background/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
                            <div className="px-6 py-5 max-lg:p-3 border-b border-white/10 flex items-center justify-between">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.3em] text-white/50 mb-1">Spotlight</p>
                                    <h3 className="text-2xl font-bold bg-gradient-to-br from-yellow-400 to-orange-500 bg-clip-text text-transparent">Past Auctions</h3>
                                    <p className="text-sm text-white/70">Recently ended auctions and final bids</p>
                                </div>
                                <button
                                    onClick={() => setPastDrawerOpen(false)}
                                    className="text-white/70 hover:text-white text-sm font-medium"
                                >
                                    Close
                                </button>
                            </div>
                            <div className="max-h-[70vh] overflow-y-auto px-6 py-5 max-md:p-3 space-y-5">
                                {pastLoading && (
                                    <div className="text-center text-white/70 text-sm">Loading past auctions...</div>
                                )}

                                {!pastLoading && pastError && (
                                    <div className="text-center space-y-3">
                                        <p className="text-red-400 text-sm">{pastError}</p>
                                        <button
                                            onClick={fetchPastAuctions}
                                            className="px-4 py-2 text-sm bg-white/10 hover:bg-white/20 rounded-md"
                                        >
                                            Retry
                                        </button>
                                    </div>
                                )}

                                {!pastLoading && !pastError && pastAuctions.length === 0 && (
                                    <div className="text-center text-white/70 text-sm">
                                        No past auctions to display yet.
                                    </div>
                                )}

                                {!pastLoading && !pastError && pastAuctions.length > 0 && (
                                    <div className="space-y-4">
                                        {pastAuctions.map((auction) => (
                                            <div key={auction._id} className="bg-black backdrop-blur-lg border border-yellow-400/20 shadow-xl shadow-orange-500/10 rounded-2xl p-5 max-lg:p-3 flex flex-col gap-4">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="space-y-1">
                                                        <p className="text-xs uppercase tracking-wide text-white/50">Ended {formatEndedLabel(auction.endDate)}</p>
                                                        <h4 className="text-lg font-semibold text-white">{auction.auctionName}</h4>
                                                        <p className="text-xs text-white/60">
                                                            Hosted by {auction.hostedBy?.display_name || (auction.hostedBy?.username ? `@${auction.hostedBy.username}` : "Unknown")}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => navigate(`/bid/${auction.blockchainAuctionId}`)}
                                                        className="text-xs px-3 py-1 bg-white/10 hover:bg-white/20 rounded-md"
                                                    >
                                                        Details
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-3 gap-3 text-sm text-white/80">
                                                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                                                        <p className="text-xs text-white/60">Winning Bid</p>
                                                        <p className="text-white font-semibold text-base">
                                                            {auction.highestBid.toLocaleString()} {auction.currency}
                                                        </p>
                                                    </div>
                                                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                                                        <p className="text-xs text-white/60">Min Bid</p>
                                                        <p className="text-white font-semibold text-base">
                                                            {auction.minimumBid.toLocaleString()} {auction.currency}
                                                        </p>
                                                    </div>
                                                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                                                        <p className="text-xs text-white/60">Participants</p>
                                                        <p className="text-white font-semibold text-base">
                                                            {auction.participantCount}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-2 text-sm">
                                                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                                                        <div>
                                                            <p className="text-xs text-white/60">Winner</p>
                                                            <p className="text-white font-semibold text-base">
                                                                {auction.topBidder?.username || (auction.topBidder?.socialId ? `User ${auction.topBidder.socialId}` : "No winner")}
                                                            </p>
                                                        </div>
                                                        {auction.topBidder && (
                                                            <button
                                                                onClick={() => navigate(`/user/${auction.topBidder?._id}`)}
                                                                className="text-xs px-3 py-1 text-white/70 hover:text-white"
                                                            >
                                                                View
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                                                        <div>
                                                            <p className="text-xs text-white/60">Host</p>
                                                            <p className="text-white font-semibold text-base">
                                                                {auction.hostedBy?.display_name || (auction.hostedBy?.username ? `@${auction.hostedBy.username}` : auction.hostedBy?.socialId || "Unknown")}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => navigate(`/user/${auction.hostedBy?._id}`)}
                                                            className="text-xs px-3 py-1 text-white/70 hover:text-white"
                                                        >
                                                            View
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="px-6 py-4 border-t border-white/10 flex justify-end">
                                <button
                                    onClick={() => setPastDrawerOpen(false)}
                                    className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md transition"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
            </div>

    )
}