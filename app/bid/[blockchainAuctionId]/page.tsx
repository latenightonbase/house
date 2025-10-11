'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { readContractSetup } from '@/utils/contractSetup';
import { auctionAbi } from '@/utils/contracts/abis/auctionAbi';
import { contractAdds } from '@/utils/contracts/contractAdds';
import { RiLoader5Fill } from 'react-icons/ri';
import { Button } from '@/components/UI/button';
import Input from '@/components/UI/Input';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/UI/Drawer';

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
  
  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [bidAmount, setBidAmount] = useState("");
  const [bidError, setBidError] = useState("");
  const [isPlacingBid, setIsPlacingBid] = useState(false);

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
          <RiLoader5Fill className='text-primary animate-spin text-3xl mx-auto' />
          <p className="mt-4 text-caption">Loading auction details...</p>
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
    return Math.round(converted).toLocaleString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const openBidDrawer = () => {
    setBidAmount("");
    setBidError("");
    setIsDrawerOpen(true);
  };

  const validateBidAmount = () => {
    if (!auctionData) return false;
    
    const amount = parseFloat(bidAmount);
    
    if (!bidAmount || isNaN(amount) || amount <= 0) {
      setBidError("Please enter a valid bid amount");
      return false;
    }

    // Convert highest bid from wei to readable format for comparison
    const currentHighestBid = parseFloat(formatBidAmount(auctionData.highestBid, auctionData.currency));

    if (amount <= currentHighestBid) {
      setBidError(`Bid must be higher than current highest bid of ${currentHighestBid} ${auctionData.currency}`);
      return false;
    }

    setBidError("");
    return true;
  };

  const handleConfirmBid = async () => {
    if (!auctionData || !validateBidAmount()) return;
    
    setIsPlacingBid(true);
    
    try {
      // Here you would implement the actual bid placement logic
      // For now, we'll just simulate a successful bid
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate network delay
      
      // Close drawer and refresh data
      setIsDrawerOpen(false);
      
      // Refresh auction data to show new bid
      // You might want to call fetchAuctionData() here or implement a refresh mechanism
      
      alert(`Bid of ${bidAmount} ${auctionData.currency} placed successfully!`);
      
    } catch (error) {
      setBidError("Failed to place bid. Please try again.");
      console.error("Bid placement error:", error);
    } finally {
      setIsPlacingBid(false);
    }
  };

  return (
    <div className="min-h-screen py-8 max-lg:pt-4">
      <div className="max-w-6xl max-lg:mx-auto px-4 sm:px-6 lg:px-8">
        {/* Auction Header */}
        <div className="bg-white/10 rounded-lg shadow-md p-4 mb-8">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-2xl font-bold gradient-text">{auctionData.auctionName}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              auctionData.auctionStatus === 'Running' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {auctionData.auctionStatus}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <p className="text-xs text-caption">End Date</p>
              <p className="text-md font-semibold">{formatDate(auctionData.endDate)}</p>
            </div>
            <div>
              <p className="text-xs text-caption">Currency</p>
              <p className="text-md font-semibold">{auctionData.currency}</p>
            </div>
            <div>
              <p className="text-xs text-caption">Highest Bid</p>
              <p className="text-md font-semibold">
                {formatBidAmount(auctionData.highestBid, auctionData.currency)} {auctionData.currency}
              </p>
            </div>
          </div>
        </div>

        {/* Bidders Section */}
        <div className="bg-white/10 rounded-lg shadow-md p-4">
          <h2 className="text-xl font-bold text-white mb-4">
            Bidders ({auctionData.bidders.length})
          </h2>
          
          {auctionData.bidders.length === 0 ? (
            <p className="text-caption text-center py-8">No bids placed yet</p>
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
                      className="w-8 h-8 rounded-full"
                      
                    />
                    <div>
                      <p className="font-semibold text-white">{bidder.displayName}</p>
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
            <Button 
              onClick={openBidDrawer}
              className="px-8 py-3 gradient-button text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Place a Bid
            </Button>
          </div>
        )}

        {/* Bid Drawer */}
        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <DrawerContent className="drawer-content">
            <DrawerHeader>
              <DrawerTitle className="my-4 text-xl">Place Your Bid</DrawerTitle>
              <div className="text-left text-md">
                {auctionData && (
                  <ul>
                    <li className="border-b border-b-white/10 py-2 flex ">
                      <span className="text-left w-1/2">Bidding on:</span> 
                      <strong className="text-primary text-right w-1/2">{auctionData.auctionName}</strong>
                    </li>
                    <li className="border-b border-b-white/10 py-2 flex ">
                      <span className="text-left w-1/2">Currency:</span>
                      <strong className="text-primary text-right w-1/2">{auctionData.currency}</strong>
                    </li>
                    {parseFloat(auctionData.highestBid) > 0 && (
                      <li className="border-b border-b-white/10 py-2 flex ">
                        <span className="text-left w-1/2">Current highest bid:</span> 
                        <strong className="text-primary text-right w-1/2">
                          {formatBidAmount(auctionData.highestBid, auctionData.currency)} {auctionData.currency}
                        </strong>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </DrawerHeader>
            
            <div className="px-4 pb-2">
              <Input
                label="Bid Amount"
                value={bidAmount}
                onChange={(value) => {
                  setBidAmount(value);
                  if (bidError) setBidError(""); // Clear error when user types
                }}
                placeholder={auctionData ? `Enter amount in ${auctionData.currency}` : "Enter bid amount"}
                type="number"
                required
                className="mb-2"
              />
              {bidError && (
                <p className="text-red-500 text-sm mt-1">{bidError}</p>
              )}
            </div>

            <DrawerFooter>
              <Button 
                onClick={handleConfirmBid}
                disabled={isPlacingBid || !bidAmount}
                className="w-full h-12 text-lg font-bold"
              >
                {isPlacingBid ? (
                  <>
                    <RiLoader5Fill className="text-2xl mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Confirm Bid"
                )}
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}