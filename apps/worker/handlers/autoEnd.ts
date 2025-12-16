import { ethers } from "ethers";
import {
  auctionAbi,
  contractAdds,
  erc20Abi,
  readContractSetup,
} from "@repo/contracts";

export async function autoEnd(blockchainAuctionId: string) {
  try {
    const pvtKey = process.env.ENDER_PVT_KEY;
    if (!pvtKey) {
      throw new Error("Ad distributor private key not set");
    }

    const rpcUrl = process.env.RPC_URL;
    if (!rpcUrl) {
      throw new Error("RPC URL not set");
    }

    const provider = new ethers.JsonRpcProvider(
      rpcUrl as string
    );
    console.log('✅ Provider setup complete');

    const wallet = new ethers.Wallet(
      pvtKey as string,
      provider
    );

    const auctionContract = new ethers.Contract(contractAdds.auctions, auctionAbi, wallet);

    const tx = await auctionContract.endAuction(blockchainAuctionId);
    console.log(`🚀 Transaction submitted: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);

    // Fetch bidders data from contract
    try {
      const bidders = await auctionContract.getBidders(blockchainAuctionId);
      console.log(`📊 Fetched ${bidders.length} bidders from contract`);

      const auctionMeta = await auctionContract?.getAuctionMeta(blockchainAuctionId);
      console.log("Contract Meta:", auctionMeta);

      const localErc20Contract = await readContractSetup(auctionMeta.caInUse, erc20Abi);
      if (!localErc20Contract) {
        console.log("ERC20 Contract not found!")
        throw new Error("Failed to setup ERC20 contract connection");
      }

      const decimals = await localErc20Contract.decimals();
      console.log("Token Decimals:", decimals);

      // Format bidders data
      const formattedBidders = bidders.map((item: any) => ({
        bidder: item[0], 
        bidAmount: ethers.formatUnits(item[1],  decimals), 
        fid: item[2]
      }));

      // Call the /end route to update database
      const workerSecret = process.env.WORKER_SECRET;
      if (!workerSecret) {
        console.warn('⚠️ WORKER_SECRET not set, skipping database update');
      } else {
        const endUrl = `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/protected/auctions/${blockchainAuctionId}/end`;
        
        const response = await fetch(endUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-worker-secret': workerSecret
          },
          body: JSON.stringify({ bidders: formattedBidders })
        });

        if (response.ok) {
          console.log('✅ Database updated successfully');
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('❌ Failed to update database:', errorData);
        }
      }
    } catch (fetchError) {
      console.error('❌ Error fetching bidders or updating database:', fetchError);
      // Don't throw - transaction already succeeded
    }

  } catch (err) {
    console.error("Error in autoEnd:", err);
    throw err;
  }
}
