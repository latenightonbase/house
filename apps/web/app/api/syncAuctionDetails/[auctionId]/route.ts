import { NextRequest } from "next/server";
import {
  auctionAbi,
  contractAdds,
  erc20Abi,
  readContractSetup,
  writeNewContractSetup,
} from "@repo/contracts";
import Auction from "@/utils/schemas/Auction";
import User from "@/utils/schemas/User";
import { ethers } from "ethers";
import { fetchTokenPrice } from "@/utils/tokenPrice";

export async function POST(req:NextRequest){
    try{
        const auctionId = req.nextUrl.pathname.split('/').pop();
        console.log("Syncing auction details for auctionId:", auctionId);

        const auctionContract = await readContractSetup(contractAdds.auctions, auctionAbi);

        if(!auctionContract){
            console.error("Auction contract is not available");
            return new Response(JSON.stringify({ error: 'Auction contract not available' }), { status: 500 });
        }

        const contractBidders = await auctionContract.getBidders(auctionId)

        const dbAuction = await Auction.findOne({ blockchainAuctionId: auctionId }).populate('bidders.user', 'wallets username socialId socialPlatform twitterProfile');
        if(!dbAuction){
            console.error("Auction not found in DB for blockchainAuctionId:", auctionId);
            return new Response(JSON.stringify({ error: 'Auction not found' }), { status: 404 });
        }

        const dbBidderWallets = new Set(
            dbAuction.bidders.map((b: any) => 
                b.user?.wallets?.map((w: string) => w.toLowerCase())
            ).flat().filter(Boolean)
        );

        console.log("DB bidder wallets:", Array.from(dbBidderWallets));

        const missingBidders = [];
        for (const contractBidder of contractBidders) {
            console.log("Checking contract bidder:", contractBidder);
            const bidderWallet = contractBidder.bidder.toLowerCase();
            if (!dbBidderWallets.has(bidderWallet)) {
                missingBidders.push(contractBidder);
            }
        }

        console.log(`Found ${missingBidders.length} missing bidders to sync for auctionId:`, auctionId);
        console.log("Missing bidders:", missingBidders);

        for (const missingBidder of missingBidders) {
            const user = await User.findOne({ 
                $or: [
                    { wallets: { $in: [missingBidder.bidder] } },
                    { socialId: missingBidder.fid }
                ]
            });

            if (user) {
                const bidAmount = Number(ethers.formatUnits(missingBidder.bidAmount, dbAuction.currency === 'USDC' ? 6 : 18));
                let usdcValue: number | undefined;
                
                if (dbAuction.currency === 'USDC') {
                    usdcValue = bidAmount;
                } else {
                    try {
                        const tokenPrice = await fetchTokenPrice(dbAuction.tokenAddress);
                        usdcValue = Math.round(bidAmount * tokenPrice * 100000000) / 100000000;
                    } catch (error) {
                        console.error(`Failed to fetch token price for ${dbAuction.tokenAddress}:`, error);
                        usdcValue = undefined;
                    }
                }

                dbAuction.bidders.push({
                    user: user._id,
                    bidAmount,
                    usdcValue,
                    bidTimestamp: new Date()
                });
            } else {
                console.warn(`User not found for wallet: ${missingBidder.bidder}`);
            }
        }

        if (missingBidders.length > 0) {
            await dbAuction.save();
        }

        return new Response(JSON.stringify({ 
            success: true, 
            syncedBidders: missingBidders.length 
        }), { status: 200 });

    }
    catch(err){
        console.error("Error in syncAuctionDetails route:", err);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
}