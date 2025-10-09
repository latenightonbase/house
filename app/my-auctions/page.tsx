'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/UI/button';
import { WalletConnect } from '@/components/Web3/walletConnect';
import toast from 'react-hot-toast';

interface Bidder {
  user: string;
  bidAmount: number;
  bidTimestamp: string;
}

interface HostInfo {
  wallet: string;
  username?: string;
}

interface Auction {
  _id: string;
  auctionName: string;
  endDate: string;
  startDate: string;
  currency: string;
  minimumBid: number;
  tokenAddress: string;
  hostedBy: HostInfo;
  bidders: Bidder[];
  highestBid: number;
  participantCount: number;
  bidCount: number;
  status: 'active' | 'upcoming' | 'ended';
  timeInfo: string;
  createdAt: string;
}

interface GroupedAuctions {
  active: Auction[];
  upcoming: Auction[];
  ended: Auction[];
}

interface ApiResponse {
  success: boolean;
  auctions: Auction[];
  grouped: GroupedAuctions;
  total: number;
  counts: {
    active: number;
    upcoming: number;
    ended: number;
  };
  error?: string;
  message?: string;
}

const MyAuctions: React.FC = () => {
  const { data: session, status } = useSession();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [groupedAuctions, setGroupedAuctions] = useState<GroupedAuctions>({
    active: [],
    upcoming: [],
    ended: []
  });
  const [counts, setCounts] = useState({ active: 0, upcoming: 0, ended: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'ended'>('active');

  const fetchMyAuctions = async () => {
    if (!session?.user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/protected/auctions/my-auctions');
      const data: ApiResponse = await response.json();
      
      if (data.success) {
        setAuctions(data.auctions);
        setGroupedAuctions(data.grouped);
        setCounts(data.counts);
      } else {
        setError(data.message || data.error || 'Failed to fetch your auctions');
        toast.error(data.message || 'Failed to fetch your auctions');
      }
    } catch (err) {
      const errorMsg = 'Network error: Unable to fetch your auctions';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchMyAuctions();
    } else if (status !== 'loading') {
      setLoading(false);
    }
  }, [session, status]);

  const formatBidAmount = (amount: number, currency: string): string => {
    return `${amount.toLocaleString()} ${currency}`;
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      active: 'bg-green-100 text-green-800 border-green-200',
      upcoming: 'bg-blue-100 text-blue-800 border-blue-200',
      ended: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusStyles[status as keyof typeof statusStyles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (status === 'loading' || loading) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-lg text-gray-600">Loading your auctions...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="h-screen w-screen flex flex-col gap-4 items-center justify-center fixed top-0 left-0 p-4 backdrop-blur-xl">
        <h2 className="text-2xl font-bold text-white mb-2">My Auctions</h2>
        <p className="text-sm text-white text-center mb-4">
          You must be logged in to view your auctions.
        </p>
        <WalletConnect />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6">
        <div className="text-center bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchMyAuctions} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const currentAuctions = groupedAuctions[activeTab] || [];

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold gradient-text">My Auctions</h1>
          <p className="text-gray-600 mt-2">Manage and track your auction listings</p>
        </div>
        <Button onClick={fetchMyAuctions} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <div className="text-2xl font-bold text-green-600">{counts.active}</div>
          <div className="text-gray-600">Active Auctions</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <div className="text-2xl font-bold text-blue-600">{counts.upcoming}</div>
          <div className="text-gray-600">Upcoming Auctions</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <div className="text-2xl font-bold text-gray-600">{counts.ended}</div>
          <div className="text-gray-600">Ended Auctions</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'active', label: 'Active', count: counts.active },
            { id: 'upcoming', label: 'Upcoming', count: counts.upcoming },
            { id: 'ended', label: 'Ended', count: counts.ended }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Auctions List */}
      {currentAuctions.length === 0 ? (
        <div className="text-center bg-gray-50 border border-gray-200 rounded-lg p-8">
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No {activeTab} auctions
          </h3>
          <p className="text-gray-600 mb-4">
            {activeTab === 'active' && "You don't have any active auctions at the moment."}
            {activeTab === 'upcoming' && "You don't have any upcoming auctions scheduled."}
            {activeTab === 'ended' && "You don't have any completed auctions yet."}
          </p>
          {activeTab !== 'ended' && (
            <Button 
              onClick={() => window.location.href = '/create'}
              className="gradient-button"
            >
              Create Your First Auction
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {currentAuctions.map((auction) => (
            <div
              key={auction._id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-800">
                      {auction.auctionName}
                    </h3>
                    {getStatusBadge(auction.status)}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Highest Bid:</span>
                      <div className="font-semibold text-primary">
                        {auction.highestBid > 0 
                          ? formatBidAmount(auction.highestBid, auction.currency)
                          : `Starting at ${formatBidAmount(auction.minimumBid, auction.currency)}`
                        }
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-gray-600">Participants:</span>
                      <div className="font-semibold">{auction.participantCount}</div>
                    </div>
                    
                    <div>
                      <span className="text-gray-600">Total Bids:</span>
                      <div className="font-semibold">{auction.bidCount}</div>
                    </div>
                    
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <div className="font-semibold">{auction.timeInfo}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 md:mt-0 md:ml-6 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = `/auction/${auction._id}`}
                  >
                    View Details
                  </Button>
                  {auction.status === 'active' && (
                    <Button
                      size="sm"
                      className="gradient-button"
                      onClick={() => window.location.href = `/auction/${auction._id}`}
                    >
                      Manage
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create New Auction CTA */}
      {auctions.length > 0 && (
        <div className="text-center mt-8 pt-8 border-t border-gray-200">
          <Button 
            onClick={() => window.location.href = '/create'}
            className="gradient-button"
            size="lg"
          >
            Create New Auction
          </Button>
        </div>
      )}
    </div>
  );
};

export default MyAuctions;