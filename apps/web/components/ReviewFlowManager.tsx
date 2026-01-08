'use client';

import React, { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth';
import { useGlobalContext } from '@/utils/providers/globalContext';
import { useRouter, usePathname } from 'next/navigation';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '@/components/UI/Drawer';
import { Button } from '@/components/UI/button';
import ReviewForm from '@/components/ReviewForm';
import toast from 'react-hot-toast';
import { Package, Trophy, MessageSquare, User, CheckCircle } from 'lucide-react';

interface PendingDelivery {
  _id: string;
  auctionId: {
    _id: string;
    auctionName: string;
    blockchainAuctionId: string;
  };
  hostId?: {
    _id: string;
    username?: string;
  };
  winnerId?: {
    _id: string;
    username?: string;
  };
  delivered: boolean;
  deliveredDate?: string;
}

const ReviewFlowManager: React.FC = () => {
  const { authenticated, getAccessToken } = usePrivy();
  const { user } = useGlobalContext();
  const router = useRouter();
  const pathname = usePathname();

  const [asHost, setAsHost] = useState<PendingDelivery[]>([]);
  const [asWinnerDelivered, setAsWinnerDelivered] = useState<PendingDelivery[]>([]);
  const [asWinnerUndelivered, setAsWinnerUndelivered] = useState<PendingDelivery[]>([]);
  const [isHostDrawerOpen, setIsHostDrawerOpen] = useState(false);
  const [isWinnerDrawerOpen, setIsWinnerDrawerOpen] = useState(false);
  const [selectedReviewAuction, setSelectedReviewAuction] = useState<PendingDelivery | null>(null);
  const [isMarkingDelivered, setIsMarkingDelivered] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authenticated && user?.socialId) {
      console.log('Fetching pending deliveries for user:', user.socialId);
      fetchPendingDeliveries();
    } else {
      setLoading(false);
    }
  }, [authenticated, user?.socialId]);

  const fetchPendingDeliveries = async () => {
    try {
      const token = await getAccessToken();
      
      const response = await fetch('/api/protected/reviews/pending-deliveries', {
        headers: { Authorization: `Bearer ${token}`, "x-user-social-id": user?.socialId || "" },
      });

      console.log('Pending deliveries response status:', response.status);

      if (response.ok) {
        const data = await response.json();

        console.log('Pending deliveries fetched:', data);

        setAsHost(data.asHost || []);
        setAsWinnerDelivered(data.asWinner?.delivered || []);
        setAsWinnerUndelivered(data.asWinner?.undelivered || []);
      }
    } catch (error) {
      console.error('Error fetching pending deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsDelivered = async (auctionId: string) => {
    setIsMarkingDelivered(auctionId);
    try {
      const token = await getAccessToken();
      const response = await fetch('/api/protected/reviews/mark-delivered', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-user-social-id': user?.socialId || '',
        },
        body: JSON.stringify({ auctionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to mark as delivered');
      }

      toast.success('Auction marked as delivered!');
      
      // Close drawer and refresh the list
      setIsHostDrawerOpen(false);
      fetchPendingDeliveries();
    } catch (error: any) {
      console.error('Error marking as delivered:', error);
      toast.error(error.message || 'Failed to mark as delivered');
    } finally {
      setIsMarkingDelivered(null);
    }
  };

  const handleReviewSuccess = () => {
    toast.success('Thank you for your review!');
    setSelectedReviewAuction(null);
    setIsWinnerDrawerOpen(false);
    fetchPendingDeliveries();
  };

  const handleCloseHostDrawer = () => {
    setIsHostDrawerOpen(false);
  };

  const handleCloseWinnerDrawer = () => {
    setIsWinnerDrawerOpen(false);
    setSelectedReviewAuction(null);
  };

  const totalWinnerCount = asWinnerDelivered.length + asWinnerUndelivered.length;
  const showHostButton = asHost.length > 0;
  const showWinnerButton = totalWinnerCount > 0;

  if (loading || !authenticated || pathname !== '/') {
    return null;
  }

  return (
    <>
      {/* Floating Action Buttons */}
      <div className={`fixed bottom-4 right-4 flex gap-3 z-40 rounded-lg bg-black ${showHostButton || showWinnerButton ? 'p-3' : ''}`}>
        {showHostButton && (
          <button
            onClick={() => setIsHostDrawerOpen(true)}
            className="relative flex text-sm font-bold items-center gap-2 bg-linear-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white rounded-lg px-4 py-2 shadow-lg hover:shadow-xl transition-all duration-200 group"
            aria-label="Pending Deliveries"
          >
            <Package className="w-6 h-6" />
            {asHost.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                {asHost.length}
              </span>
            )}
            
          </button>
        )}

        {showWinnerButton && (
          <button
            onClick={() => setIsWinnerDrawerOpen(true)}
            className="relative flex text-sm font-bold items-center gap-2 bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg px-4 py-2 shadow-lg hover:shadow-xl transition-all duration-200 group"
            aria-label="Won Auctions"
          >
            <Trophy className="w-6 h-6" />
            {totalWinnerCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                {totalWinnerCount}
              </span>
            )}
            
          </button>
        )}
      </div>

      {/* Host Delivery Drawer */}
      <Drawer open={isHostDrawerOpen} onOpenChange={setIsHostDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="text-center gradient-text text-2xl">
              Pending Deliveries
            </DrawerTitle>
            <DrawerDescription className="text-center text-white/70">
              Mark auctions as delivered to allow winners to leave reviews
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {asHost.map((delivery) => (
              <div 
                key={delivery._id}
                className="bg-black/40 backdrop-blur-md border border-primary/20 rounded-xl p-4 space-y-3"
              >
                <div>
                  <p className="text-white/70 text-sm mb-1">Auction</p>
                  <button
                    onClick={() => router.push(`/bid/${delivery.auctionId.blockchainAuctionId}`)}
                    className="text-white font-semibold text-lg hover:text-primary transition-colors text-left"
                  >
                    {delivery.auctionId.auctionName}
                  </button>
                </div>

                <div>
                  <p className="text-white/70 text-sm mb-1">Winner</p>
                  <p className="text-white font-semibold">
                    {delivery.winnerId?.username || 'Unknown'}
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => router.push(`/user/${delivery.winnerId?._id}`)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <User className="w-4 h-4 mr-1" />
                    Winner
                  </Button>
                  <Button
                    onClick={() => handleMarkAsDelivered(delivery.auctionId._id)}
                    disabled={isMarkingDelivered === delivery.auctionId._id}
                    size="sm"
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    {isMarkingDelivered === delivery.auctionId._id ? 'Marking...' : 'Delivered'}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline" onClick={handleCloseHostDrawer}>
                Close
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Winner Review Drawer */}
      <Drawer open={isWinnerDrawerOpen} onOpenChange={setIsWinnerDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="text-center gradient-text text-2xl">
              {selectedReviewAuction ? 'Leave a Review' : 'Your Won Auctions'}
            </DrawerTitle>
            <DrawerDescription className="text-center text-white/70">
              {selectedReviewAuction 
                ? 'Share your experience with this auction'
                : 'Auctions you won'}
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="p-6">
            {selectedReviewAuction ? (
              <ReviewForm
                auctionId={selectedReviewAuction.auctionId._id}
                auctionName={selectedReviewAuction.auctionId.auctionName}
                onSuccess={handleReviewSuccess}
                onCancel={() => setSelectedReviewAuction(null)}
                user={user}
              />
            ) : (
              <div className="space-y-6 max-h-[60vh] overflow-y-auto">
                {/* Delivered - Ready for Review */}
                {asWinnerDelivered.length > 0 && (
                  <div>
                    <h3 className="text-white font-semibold mb-3 text-lg">Ready for Review</h3>
                    <div className="space-y-3">
                      {asWinnerDelivered.map((delivery) => (
                        <div 
                          key={delivery._id}
                          className="bg-black/40 backdrop-blur-md border border-primary/20 rounded-xl p-4 space-y-3"
                        >
                          <div>
                            <p className="text-white/70 text-sm mb-1">Auction</p>
                            <button
                              onClick={() => router.push(`/bid/${delivery.auctionId.blockchainAuctionId}`)}
                              className="text-white font-semibold text-lg hover:text-primary transition-colors text-left"
                            >
                              {delivery.auctionId.auctionName}
                            </button>
                          </div>

                          <div>
                            <p className="text-white/70 text-sm mb-1">Host</p>
                            <p className="text-white font-semibold">
                              {delivery.hostId?.username || 'Unknown'}
                            </p>
                          </div>

                          <Button
                            onClick={() => setSelectedReviewAuction(delivery)}
                            size="sm"
                            className="w-full"
                          >
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Leave Review
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Undelivered - Contact Host */}
                {asWinnerUndelivered.length > 0 && (
                  <div>
                    <h3 className="text-white font-semibold mb-3 text-lg">Awaiting Delivery</h3>
                    <div className="space-y-3">
                      {asWinnerUndelivered.map((delivery) => (
                        <div 
                          key={delivery._id}
                          className="bg-black/40 backdrop-blur-md border border-primary/20 rounded-xl p-4 space-y-3"
                        >
                          <div>
                            <p className="text-white/70 text-sm mb-1">Auction</p>
                            <button
                              onClick={() => router.push(`/bid/${delivery.auctionId.blockchainAuctionId}`)}
                              className="text-white font-semibold text-lg hover:text-primary transition-colors text-left"
                            >
                              {delivery.auctionId.auctionName}
                            </button>
                          </div>

                          <div>
                            <p className="text-white/70 text-sm mb-1">Host</p>
                            <p className="text-white font-semibold">
                              {delivery.hostId?.username || 'Unknown'}
                            </p>
                          </div>

                          <Button
                            onClick={() => router.push(`/user/${delivery.hostId?._id}`)}
                            variant="outline"
                            size="sm"
                            className="w-full"
                          >
                            <User className="w-4 h-4 mr-1" />
                            Contact Host
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {!selectedReviewAuction && (
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="outline" onClick={handleCloseWinnerDrawer}>
                  Close
                </Button>
              </DrawerClose>
            </DrawerFooter>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default ReviewFlowManager;