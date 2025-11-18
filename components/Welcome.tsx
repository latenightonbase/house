"use client";

import { useGlobalContext } from "@/utils/providers/globalContext";
import { useNavigateWithLoader } from "@/utils/useNavigateWithLoader";
import Image from "next/image";
import Link from "next/link";
import { FaPlus } from "react-icons/fa";
import { IoMdNotifications } from "react-icons/io";
import { useCallback, useState } from "react";
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
  DrawerTrigger,
} from "@/components/UI/Drawer";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { useSession } from "next-auth/react";

export default function Welcome() {

    const {user} = useGlobalContext();
    const navigate = useNavigateWithLoader();
    const [isAddingMiniApp, setIsAddingMiniApp] = useState(false);
    const {context} = useMiniKit()

    const {data:session} = useSession()

    // Check if user has already enabled notifications
    const hasNotifications = user?.notificationDetails?.token;
    
    // Open drawer by default if user doesn't have notifications enabled
    const [drawerOpen, setDrawerOpen] = useState(!hasNotifications && !!user);

    const handleAddMiniApp = useCallback(async () => {
        setIsAddingMiniApp(true);
        try {
            const response = await sdk.actions.addMiniApp();
            
            if (response.notificationDetails) {
                console.log("MiniApp added with notification details:", response.notificationDetails);
                console.log("User wallet:", session?.wallet);
                
                // Save notification details to user
                const saveResponse = await fetch('/api/miniapp/notifications/save', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        wallet: session?.wallet,
                        notificationDetails: response.notificationDetails
                    })
                });

                const saveResult = await saveResponse.json();
                console.log("Save response:", saveResult);

                if (!saveResponse.ok) {
                    throw new Error(saveResult.error || "Failed to save notification details");
                }

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
    }, [user?.wallet]);

    if(context)
    return (
            <div className="space-y-4 flex flex-col  max-lg:justify-center w-full">
                <div className="text-left text-caption flex flex-col font-semibold text-xl gap-2 mb-4">
                    Welcome to <span className="gradient-text text-3xl block font-bold">The House!</span>
                </div>
                <div className="bg-white/10 w-fit rounded-full px-2 py-1 text-xs flex items-center justify-center gap-1 text-white">by <span><Image src={`/lnob.jpg`} alt="lnob" width={20} height={20} className="w-4 aspect-square rounded-full " /></span> latenightonbase(LNOB)</div>

                <button onClick={()=>{navigate('/create')}} className= " max-lg:w-full w-80 px-6 py-3 hover:-translate-y-1 duration-200 gradient-button flex gap-2 items-center justify-center text-white rounded-md hover:bg-green-700 transition">
                    <FaPlus/> Create Auction
                </button>

                {!hasNotifications && user && (
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

                {hasNotifications && (
                    <div className="max-lg:w-full w-80 px-4 py-2 bg-green-600/20 border border-green-600/50 flex gap-2 items-center justify-center text-green-400 rounded-md text-sm">
                        <IoMdNotifications className="text-lg"/> 
                        Notifications Enabled
                    </div>
                )}
            </div>

    )
}