import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/utils/db";
import Auction, { IBidder } from "@/utils/schemas/Auction";
import User from "@/utils/schemas/User";
import PendingDelivery from "@/utils/schemas/PendingDelivery";
import { ethers } from "ethers";
import { fetchTokenPrice, calculateUSDValue } from "@/utils/tokenPrice";
import { authenticateRequest } from "@/utils/authService";
import { sendNotification } from "@repo/queue";
import { awardXP, calculateWinXP } from "@/utils/xpService";

export async function POST(req: NextRequest) {
  try {
    // Check for worker secret first (for automated worker requests)
    const workerSecret = req.headers.get("x-worker-secret");
    const isWorkerRequest =
      workerSecret && workerSecret === process.env.WORKER_SECRET;

    // If not a worker request, authenticate with Privy
    if (!isWorkerRequest) {
      const authResult = await authenticateRequest(req);
      if (!authResult.success) {
        console.error("❌ [AUTH] Authentication failed");
        return authResult.response;
      }
    } else {
      console.log("✅ [AUTH] Worker request authenticated");
    }

    // Extract blockchainAuctionId from the URL
    const blockchainAuctionId = req.nextUrl.pathname.split("/")[4];

    if (!blockchainAuctionId) {
      console.error("❌ [AUCTION ID] Missing blockchain auction ID");
      return NextResponse.json(
        { error: "Auction ID is required" },
        { status: 400 }
      );
    }

    // Parse request body to get bidders data from contract
    const body = await req.json();
    const { bidders: contractBidders } = body;

    await dbConnect();

    // Find the auction
    const auction = await Auction.findOne({ blockchainAuctionId }).populate(
      "hostedBy"
    );

    console.log("[AUCTION END] Fetched auction:", auction);

    if (!auction) {
      console.error("❌ [AUCTION LOOKUP] Auction not found in database");
      return NextResponse.json({ error: "Auction not found" }, { status: 404 });
    }

    // Skip ownership check for worker requests (contract already validated)
    if (!isWorkerRequest) {
      // Get the wallet address from session
      // @ts-ignore
      const socialId = req.headers.get("x-user-wallet");

      if (!socialId) {
        console.error(
          "❌ [WALLET] Wallet address not found in request headers"
        );
        return NextResponse.json(
          { error: "Wallet address not found in session" },
          { status: 400 }
        );
      }

      // Find the user to verify ownership
      const user = await User.findOne({ socialId: socialId });
      if (!user) {
        console.error("❌ [USER LOOKUP] User not found in database");
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Check if the user is the host of the auction
      if (auction.hostedBy._id.toString() !== user._id.toString()) {
        console.error("❌ [OWNERSHIP] User is not the auction host");
        return NextResponse.json(
          { error: "Only the auction host can end the auction" },
          { status: 403 }
        );
      }
    }

    // Check if auction is currently active
    const currentDate = new Date();

    const finalizeWinner = async (
      winnerUser: any,
      bidAmount: number,
      usdValue: number | null
    ) => {
      auction.winningBid = winnerUser._id;

      // Update the winner's bidsWon field
      await User.findByIdAndUpdate(winnerUser._id, {
        $addToSet: { bidsWon: auction._id },
      });

      // Award XP for winning auction (non-blocking)
      const winXP = calculateWinXP(usdValue || 0);
      try {
        await awardXP({
          userId: winnerUser._id,
          amount: winXP,
          action: 'WIN_AUCTION',
          metadata: {
            auctionId: auction._id,
            auctionName: auction.auctionName,
            bidAmount,
            usdValue: usdValue ?? undefined,
          },
        });
        console.log(`✅ Awarded ${winXP} XP for winning auction`);
      } catch (err) {
        console.error('⚠️ Failed to award XP for auction win:', err);
      }

      const { token, url } = winnerUser.notificationDetails || {};

      if (token && url) {
        // Send notification to winner
        const notificationTitle = `🎉 You won the ${auction.auctionName}!`;
        const notificationBody = `Contact the host here:`;
        const targetUrl = `${
          process.env.NEXT_PUBLIC_URL || "http://localhost:3000"
        }/user/${auction.hostedBy._id}`;

        await sendNotification(
          url,
          token,
          notificationTitle,
          notificationBody,
          targetUrl
        );
      }

      const { token: tokenHost, url: urlHost } =
        auction.hostedBy.notificationDetails || {};

      if (tokenHost && urlHost) {
        // Send notification to host
        const notificationTitle = `🏆 Your auction "${auction.auctionName}" has ended!`;
        const notificationBody = `Contact the winner here:`;
        const targetUrl = `${
          process.env.NEXT_PUBLIC_URL || "http://localhost:3000"
        }/user/${auction.winningBid}`;
        await sendNotification(
          urlHost,
          tokenHost,
          notificationTitle,
          notificationBody,
          targetUrl
        );
      }
    };

    // Update auction with bidders data from contract
    if (Array.isArray(contractBidders) && contractBidders.length > 0) {
      // Clear existing bidders array
      auction.bidders = [];

      // Determine decimal places based on token address
      const isUSDC =
        auction.tokenAddress?.toLowerCase() ===
        "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";

      // Fetch token price for USD conversion
      let tokenPriceUSD = 0;
      try {
        if (!isUSDC) {
          // Only fetch price for non-USDC tokens (USDC price is always $1)
          tokenPriceUSD = await fetchTokenPrice(auction.tokenAddress);
        } else {
          tokenPriceUSD = 1; // USDC is always $1
        }
      } catch (error) {
        console.error("❌ [PRICE] Error fetching token price:", error);
        // Continue without USD value if price fetch fails
        tokenPriceUSD = 0;
      }

      // Create sub array to track all bids
      const allBids = [];

      // Process each bidder from contract
      for (let i = 0; i < contractBidders.length; i++) {
        const contractBidder = contractBidders[i];

        // Find or create user for each bidder
        let bidderUser = await User.findOne({
          $or: [
            { socialId: contractBidder.fid },
            {
              socialPlatform: "TWITTER",
              wallets: contractBidder.fid,
            },
          ],
        });

        if (!bidderUser) {
          return NextResponse.json(
            { error: `Bidder with FID ${contractBidder.fid} not found` },
            { status: 404 }
          );
        }

        const formattedString = contractBidder.bidAmount;

        const formattedBidAmount = Number(formattedString);

        // Calculate USD value
        let usdValue = null;
        if (tokenPriceUSD > 0) {
          usdValue = calculateUSDValue(formattedBidAmount, tokenPriceUSD);
        }

        const bidData = {
          user: bidderUser._id,
          bidAmount: formattedBidAmount,
          usdcValue: usdValue,
          bidTimestamp: new Date(), // Use current time since we don't have exact timestamp from contract
        };

        // Add to both arrays
        auction.bidders.push(bidData as IBidder);
        allBids.push({ ...bidData, bidderUser });
      }

      // Find bid with highest usdValue and set winningBid
      if (allBids.length > 0) {
        const highestBid = allBids.reduce((prev, current) => {
          return (current.usdcValue || 0) > (prev.usdcValue || 0)
            ? current
            : prev;
        });

        console.log("[AUCTION END] Winning bid determined:", highestBid);
        await finalizeWinner(
          highestBid.bidderUser,
          highestBid.bidAmount,
          highestBid.usdcValue ?? null
        );
      } else {
        auction.winningBid = "no_bids";
      }
    } else if (auction.bidders && auction.bidders.length > 0) {
      const highestBid = auction.bidders.reduce((prev, current) => {
        const prevValue = prev.usdcValue ?? prev.bidAmount;
        const currentValue = current.usdcValue ?? current.bidAmount;
        return currentValue > prevValue ? current : prev;
      });

      const winnerUser = await User.findById(highestBid.user);
      if (!winnerUser) {
        return NextResponse.json(
          { error: "Winner not found" },
          { status: 404 }
        );
      }

      console.log("[AUCTION END] Winning bid determined from DB:", {
        userId: winnerUser._id,
        bidAmount: highestBid.bidAmount,
        usdcValue: highestBid.usdcValue,
      });

      await finalizeWinner(
        winnerUser,
        highestBid.bidAmount,
        highestBid.usdcValue ?? null
      );
    } else {
      auction.winningBid = "no_bids";
    }

    auction.endDate = currentDate;

    auction.status = "ended";
    await auction.save();

    // Create PendingDelivery document if there's a winner
    if (auction.winningBid && auction.winningBid !== "no_bids") {
      try {
        const host = await User.findById(auction.hostedBy);
        const winner = await User.findById(auction.winningBid);

        if (host && winner && host.socialId && winner.socialId) {
          await PendingDelivery.create({
            auctionId: auction._id,
            hostId: host._id,
            winnerId: winner._id,
            hostSocialId: host.socialId,
            winnerSocialId: winner.socialId,
            delivered: false,
          });
          console.log("[PENDING DELIVERY] Created pending delivery record");
        }
      } catch (error) {
        console.error("❌ [PENDING DELIVERY] Failed to create:", error);
        // Don't fail the auction end if pending delivery creation fails
      }
    }

    // Trigger fee distribution in the background (true fire-and-forget)
    // This runs server-side so it continues even if client disconnects

    if (auction.tokenAddress) {
      // Create the fee distribution request
      const feeDistributionPayload = {
        token: auction.tokenAddress,
      };

      const feeDistributionUrl = `${
        process.env.NEXTAUTH_URL || "http://localhost:3000"
      }/api/handleFeeDistribution`;

      fetch(feeDistributionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(feeDistributionPayload),
      }).catch((error) => {
        // Only catch to prevent unhandled rejection warnings
        console.error(
          "❌ [FEE DISTRIBUTION] Request failed to initiate:",
          error
        );
        console.error("❌ [FEE DISTRIBUTION] Error details:", error.message);
      });
    }
    const response = {
      success: true,
      message: "Auction ended successfully",
      tokenAddress: auction.tokenAddress,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error("\n❌ [ERROR] Critical error ending auction");
    console.error("❌ [ERROR] Error type:", error?.constructor?.name);
    console.error("❌ [ERROR] Error message:", error?.message);
    console.error("❌ [ERROR] Full error:", error);
    console.error("❌ [ERROR] Stack trace:", error?.stack);

    const errorResponse = {
      success: false,
      error: "Internal server error",
      message: "Failed to end auction",
    };
    console.log(
      "📤 [ERROR RESPONSE] Response data:",
      JSON.stringify(errorResponse, null, 2)
    );
    console.log("📤 [ERROR RESPONSE] Status code: 500");
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
