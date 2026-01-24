"use client";

import { useGlobalContext } from "@/utils/providers/globalContext";
import Image from "next/image";
import Link from "next/link";
import { useNavigateWithLoader } from "@/utils/useNavigateWithLoader";
import { useRouter, usePathname } from "next/navigation";
import {
  Info,
  Trophy,
  QrCode,
  User,
  PlusCircle,
  Clock,
} from "lucide-react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import LoginWithOAuth from "../utils/twitterConnect";
import AggregateConnector from "../utils/aggregateConnector";
import ReviewFlowManager from "@/components/ReviewFlowManager";
import { useCallback, useState, useEffect } from "react";
import { getAccessToken } from '@privy-io/react-auth';

export default function Navbar() {
  const { wallets } = useWallets();
  const externalWallets = wallets.filter(
    (wallet) => wallet.walletClientType !== "privy"
  );

  const { user } = useGlobalContext();
  const address =
    externalWallets.length > 0 ? externalWallets[0].address : null;
  const navigateWithLoader = useNavigateWithLoader();
  const pathname = usePathname();

  const handleNavClick = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    navigateWithLoader(path);
  };

  const router = useRouter();

  const { authenticated } = usePrivy();

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

  return (
    <>
      {/* Mobile Bottom Navbar */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-black border-t border-white/30 z-50 lg:hidden">
        <div className="w-full h-full flex justify-around items-center px-2">
          {/* Auctions */}
          <button
            onClick={() => {
              router.push("/");
            }}
            className="flex flex-col items-center justify-center flex-1"
          >
            <div className={` ${pathname === "/" && "selected-gradient w-7 flex items-center justify-center aspect-square rounded-md"} `}>
              <Image
                src="/pfp.jpg"
                alt="Auctions"
                width={20}
                height={20}
                className={`rounded-md mb-0.5 ${pathname === "/" ? "opacity-100" : "opacity-60"}`}
              />
            </div>
            <span className={`text-[10px] ${pathname === "/" ? "text-primary" : "text-white/60"}`}>
              Auctions
            </span>
          </button>

          {/* Leaderboard */}
          <a
            href="/leaderboard"
            onClick={(e) => handleNavClick(e, "/leaderboard")}
            className="flex flex-col items-center justify-center flex-1"
          ><div className={` ${pathname=== "/leaderboard" && "selected-gradient w-7 flex items-center justify-center aspect-square rounded-md"} `}>
            <Trophy className={`w-5 h-5 mb-0.5 ${pathname === "/leaderboard" ? "text-white " : "text-white/60"}`} />
          </div>
            
            <span className={`text-[10px] ${pathname === "/leaderboard" ? "text-primary" : "text-white/60"}`}>
              Leaderboard
            </span>
          </a>

          {/* Reviews */}
          <ReviewFlowManager isMobile={true} />

          {/* Create */}
          {authenticated && address && (
            <a
              href="/create"
              onClick={(e) => handleNavClick(e, "/create")}
              className="flex flex-col items-center justify-center flex-1"
            >
              <div className={` ${pathname === "/create" && "selected-gradient w-7 flex items-center justify-center aspect-square rounded-md"} `}>
                <PlusCircle className={`w-5 h-5 mb-0.5 ${pathname === "/create" ? "text-white" : "text-primary/70"}`} />
              </div>
              <span className={`text-[10px] ${pathname === "/create" ? "text-primary" : "text-primary/60"}`}>
                Create
              </span>
            </a>
          )}

          {/* Past Auctions
          <button
            onClick={() => setPastDrawerOpen(true)}
            className="flex flex-col items-center justify-center flex-1"
          >
            <div className={` ${pastDrawerOpen && "selected-gradient w-7 flex items-center justify-center aspect-square rounded-md"} `}>
              <Clock className={`w-5 h-5 mb-0.5 ${pastDrawerOpen ? "text-white" : "text-white/60"}`} />
            </div>
            <span className={`text-[10px] ${pastDrawerOpen ? "text-primary" : "text-white/60"}`}>
              Past
            </span>
          </button> */}

          {/* Info */}
          <a
            href="/info"
            onClick={(e) => handleNavClick(e, "/info")}
            className="flex flex-col items-center justify-center flex-1"
          >
            <div className={` ${pathname === "/info" && "selected-gradient w-7 flex items-center justify-center aspect-square rounded-md"} `}>
              <Info className={`w-5 h-5 mb-0.5 ${pathname === "/info" ? "text-white" : "text-white/60"}`} />
            </div>
            <span className={`text-[10px] ${pathname === "/info" ? "text-primary" : "text-white/60"}`}>
              Info
            </span>
          </a>

          {/* Profile */}
          <div className="flex flex-col items-center justify-center flex-1">
            <div className="flex flex-col items-center">
              <div className={` ${pathname === "/profile" && "selected-gradient w-7 flex items-center justify-center aspect-square rounded-md"} `}>
                <AggregateConnector/>
              </div>
              
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Bottom Navbar */}
      <div className="hidden lg:flex lg:fixed lg:bottom-0 lg:left-0 lg:right-0 h-24 lg:items-center lg:justify-between lg:px-6 lg:z-50">
        {/* Left - AggregateConnector */}
        <div className="flex items-center">
          <AggregateConnector />
        </div>

        {/* Center - Floating Mini Navbar */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-xl bg-black/80 border border-white/10 backdrop-blur-md ">
          {/* House Logo */}
          <button
            onClick={() => {
              router.push("/");
            }}
            className={` rounded-xl overflow-hidden transition-all hover:scale-105 duration-200 ${
              pathname === "/"
                ? "text-white shadow-lg shadow-primary/30"
                : "text-white hover:text-white hover:bg-white/10 bg-white/5"
            }`}
          >
            <Image
              src="/pfp.jpg"
              alt="Logo"
              width={48}
              height={48}
              className="rounded-xl"
            />
          </button>

          {/* Separator */}
          <div className="w-[2px] h-8 bg-white/10"></div>

          {/* Leaderboard */}
          <a
            href="/leaderboard"
            onClick={(e) => handleNavClick(e, "/leaderboard")}
            className={`p-2 w-[48px] aspect-square flex items-center justify-center rounded-xl transition-all hover:scale-105 duration-200 ${
              pathname === "/leaderboard"
                ? "text-white selected-gradient"
                : "text-white hover:text-white hover:bg-white/10 bg-white/5"
            }`}
          >
            <Trophy className={` ${
              pathname === "/leaderboard"
                ? "text-white"
                : "text-white/30"
            } w-5 h-5`} />
          </a>

          {/* Past Auctions */}
          <button
            onClick={() => setPastDrawerOpen(true)}
            className={`p-2 w-[48px] aspect-square flex items-center justify-center rounded-xl transition-all hover:scale-105 duration-200 ${
              pastDrawerOpen
                ? "text-white selected-gradient"
                : "text-white hover:text-white hover:bg-white/10 bg-white/5"
            }`}
          >
            <Clock className={` ${
              pastDrawerOpen
                ? "text-white"
                : "text-white/30"
            } w-5 h-5`} />
          </button>

          {/* Information */}
          <a
            href="/info"
            onClick={(e) => handleNavClick(e, "/info")}
            className={`p-2 w-[48px] aspect-square flex items-center justify-center rounded-xl transition-all hover:scale-105 duration-200 ${
              pathname === "/info"
                ? "text-white selected-gradient"
                : "text-white hover:text-white hover:bg-white/10 bg-white/5"
            }`}
          >
            <Info className={` ${
              pathname === "/info"
                ? "text-white"
                : "text-white/30"
            } w-5 h-5`} />
          </a>

          {/* Profile */}
          <a
            href="/profile"
            onClick={(e) => handleNavClick(e, "/profile")}
            className={`p-2 w-[48px] aspect-square flex items-center justify-center rounded-xl transition-all hover:scale-105 duration-200 ${
              pathname === "/profile"
                ? "text-white selected-gradient"
                : "text-white hover:text-white hover:bg-white/10 bg-white/5"
            }`}
          >
            <User className={` ${
              pathname === "/profile"
                ? "text-white"
                : "text-white/30"
            } w-5 h-5`} />
          </a>

          {/* Reviews */}
          <ReviewFlowManager isMobile={false} />

          {authenticated && address && (
            <>
            {/* Separator */}
            <div className="w-[2px] h-8 bg-white/10"></div>

            {/* Create Button */}
            <a
              href="/create"
              onClick={(e) => handleNavClick(e, "/create")}
              className={`p-2 w-[48px] aspect-square flex items-center justify-center rounded-xl transition-all hover:scale-105 duration-200 ${
                pathname === "/create"
                  ? "text-white selected-gradient"
                  : "text-primary/70 bg-primary/10 hover:text-primary/90 hover:bg-primary/30"
              }`}
            >
              <PlusCircle className={` ${
                pathname === "/create"
                  ? "text-white"
                  : "text-primary/70"
              } w-5 h-5`} />
            </a>
          </>)}
        </div>

        {/* Right - Empty space for balance */}
        <div className="w-[200px]"></div>
      </div>

      {/* Past Auctions Drawer */}
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
                          onClick={() => navigateWithLoader(`/bid/${auction.blockchainAuctionId}`)}
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
                              onClick={() => navigateWithLoader(`/user/${auction.topBidder?._id}`)}
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
                            onClick={() => navigateWithLoader(`/user/${auction.hostedBy?._id}`)}
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
    </>
  );
}
