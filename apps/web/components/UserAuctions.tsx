'use client'

import { Button } from './UI/button'
import { useRouter } from 'next/navigation'

interface Auction {
  _id: string
  auctionName: string
  endDate: string
  startDate: string
  currency: string
  blockchainAuctionId: string
  minimumBid: number
  highestBid: number
  biddersCount: number
}

interface UserAuctionsProps {
  activeAuctions: Auction[]
  endedAuctions: Auction[]
}

export default function UserAuctions({ activeAuctions, endedAuctions }: UserAuctionsProps) {
  const router = useRouter()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatBidAmount = (amount: number, currency: string) => {
    console.log('formatBidAmount - amount:', amount, 'type:', typeof amount, 'currency:', currency)
    
    // If amount is already in human-readable format (less than 1000), return as-is
    if (amount < 1000) {
      return amount.toFixed(2)
    }
    
    // Otherwise, assume it's in wei format and convert
    const decimals = currency.toUpperCase() === 'USDC' ? 6 : 18
    const converted = amount / Math.pow(10, decimals)
    console.log('Converted amount:', converted)
    return converted.toFixed(2)
  }

  const AuctionCard = ({ auction, isActive }: { auction: Auction; isActive: boolean }) => (
    <div className="bg-white/10 rounded-lg p-4 hover:bg-white/15 transition-all duration-200 border border-white/10">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-bold text-white truncate flex-1 mr-2">{auction.auctionName}</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
          isActive 
            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
            : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          {isActive ? 'Active' : 'Ended'}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-caption">Currency:</span>
          <span className="text-white font-medium">{auction.currency}</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-caption">Minimum Bid:</span>
          <span className="text-white font-medium">
            {formatBidAmount(auction.minimumBid, auction.currency)} {auction.currency}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-caption">Highest Bid:</span>
          <span className="text-primary font-bold">
            {auction.highestBid > 0 
              ? `${formatBidAmount(auction.highestBid, auction.currency)} ${auction.currency}`
              : 'No bids yet'
            }
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-caption">Bidders:</span>
          <span className="text-white font-medium">{auction.biddersCount}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-caption">{isActive ? 'Ends:' : 'Ended:'}</span>
          <span className="text-white font-medium">{formatDate(auction.endDate)}</span>
        </div>
      </div>

      <Button
        onClick={() => router.push(`/bid/${auction.blockchainAuctionId}`)}
        className="w-full"
      >
        View Auction
      </Button>
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Active Auctions */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">
          Active Auctions ({activeAuctions.length})
        </h2>
        {activeAuctions.length === 0 ? (
          <div className="bg-white/5 rounded-lg p-8 text-center">
            <p className="text-caption">No active auctions</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeAuctions.map((auction) => (
              <AuctionCard key={auction._id} auction={auction} isActive={true} />
            ))}
          </div>
        )}
      </div>

      {/* Ended Auctions */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">
          Ended Auctions ({endedAuctions.length})
        </h2>
        {endedAuctions.length === 0 ? (
          <div className="bg-white/5 rounded-lg p-8 text-center">
            <p className="text-caption">No ended auctions</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {endedAuctions.map((auction) => (
              <AuctionCard key={auction._id} auction={auction} isActive={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

