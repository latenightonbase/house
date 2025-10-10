'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { readContractSetup } from '@/utils/contractSetup';
import { auctionAbi } from '@/utils/contracts/abis/auctionAbi';
import { contractAdds } from '@/utils/contracts/contractAdds';

interface Bidder {
  displayName: string;
  image: string;
  bidAmount: string;
  walletAddress: string;
}

interface ContractBidder {
  bidder: string;
  bidAmount: bigint;
  fid: string;
}

interface AuctionData {
  auctionName: string;
  auctionStatus: 'Running' | 'Ended';
  endDate: string;
  currency: string;
  highestBid: string;
  bidders: Bidder[];
}

export default function BidPage() {
  const params = useParams();
  const blockchainAuctionId = params.blockchainAuctionId as string;
  
  const [auctionData, setAuctionData] = useState<AuctionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAuctionData = async () => {
      try {
        setLoading(true);
        
        // Get bidders from contract
        let contractBidders: ContractBidder[] = [];
        try {
          console.log('Setting up contract...');
          const contract = await readContractSetup(contractAdds.auctions, auctionAbi);
          
          if (contract) {
            console.log('Fetching bidders from contract for auction ID:', blockchainAuctionId);
            contractBidders = await contract.getBidders(blockchainAuctionId);
            console.log('Fetched bidders from contract:', contractBidders.length);
          }
        } catch (contractError) {
          console.error('Error fetching bidders from contract:', contractError);
          // Continue with empty bidders array if contract call fails
        }
        
        // Process the bidders data via API (which will also fetch auction info)
        const processedResponse = await fetch(`/api/bid/${blockchainAuctionId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contractBidders: contractBidders.map(bidder => ({
              bidder: bidder.bidder,
              bidAmount: bidder.bidAmount.toString(),
              fid: bidder.fid
            }))
          })
        });
        
        if (!processedResponse.ok) {
          const errorData = await processedResponse.json();
          throw new Error(errorData.error || 'Failed to process auction data');
        }
        
        const data = await processedResponse.json();
        setAuctionData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (blockchainAuctionId) {
      fetchAuctionData();
    }
  }, [blockchainAuctionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading auction details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!auctionData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">No auction data found</p>
      </div>
    );
  }

  const formatBidAmount = (amount: string, currency: string) => {
    // Use 6 decimals for USDC, otherwise use 18 decimals for ETH and other tokens
    const decimals = currency.toUpperCase() === 'USDC' ? 6 : 18;
    const converted = parseFloat(amount) / Math.pow(10, decimals);
    return converted.toFixed(4);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl max-lg:mx-auto px-4 sm:px-6 lg:px-8">
        {/* Auction Header */}
        <div className="bg-white/10 rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-3xl font-bold gradient-text">{auctionData.auctionName}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              auctionData.auctionStatus === 'Running' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {auctionData.auctionStatus}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">End Date</p>
              <p className="text-lg font-semibold">{formatDate(auctionData.endDate)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Currency</p>
              <p className="text-lg font-semibold">{auctionData.currency}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Highest Bid</p>
              <p className="text-lg font-semibold">
                {formatBidAmount(auctionData.highestBid, auctionData.currency)} {auctionData.currency}
              </p>
            </div>
          </div>
        </div>

        {/* Bidders Section */}
        <div className="bg-white/10 rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-white mb-6">
            Bidders ({auctionData.bidders.length})
          </h2>
          
          {auctionData.bidders.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No bids placed yet</p>
          ) : (
            <div className="space-y-4">
              {auctionData.bidders
                .sort((a, b) => parseFloat(b.bidAmount) - parseFloat(a.bidAmount))
                .map((bidder, index) => (
                <div key={index} className="flex items-center justify-between p-4 border border-primary bg-primary/10 rounded-lg hover:bg-white/20 duration-200">
                  <div className="flex items-center space-x-4">
                    <img 
                      src={bidder.image} 
                      alt={bidder.displayName}
                      className="w-12 h-12 rounded-full"
                      
                    />
                    <div>
                      <p className="font-semibold text-white">{bidder.displayName}</p>
                      <p className="text-sm text-caption">
                        {bidder.walletAddress.slice(0, 6)}...{bidder.walletAddress.slice(-4)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-bold text-lg">
                      {formatBidAmount(bidder.bidAmount, auctionData.currency)} {auctionData.currency}
                    </p>
                    {index === 0 && (
                      <span className="text-xs text-green-600 font-medium">Highest Bid</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Place Bid Button (if auction is running) */}
        {auctionData.auctionStatus === 'Running' && (
          <div className="mt-8 text-center">
            <button className="px-8 py-3 gradient-button text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
              Place a Bid
            </button>
          </div>
        )}
      </div>
    </div>
  );
}