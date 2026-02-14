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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/UI/Dialog';
import { Button } from '@/components/UI/button';
import ReviewForm from '@/components/ReviewForm';
import toast from 'react-hot-toast';
import { Package, Trophy, MessageSquare, User, CheckCircle, Bell } from 'lucide-react';

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

interface ReviewFlowManagerProps {
  isMobile?: boolean;
}

const ReviewFlowManager: React.FC<ReviewFlowManagerProps> = ({ isMobile = false }) => {
  const { authenticated, getAccessToken } = usePrivy();
  const { user } = useGlobalContext();
  const router = useRouter();
  const pathname = usePathname();

  const [asHost, setAsHost] = useState<PendingDelivery[]>([]);
  const [asWinner, setAsWinner] = useState<PendingDelivery[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeView, setActiveView] = useState<'host' | 'winner'>('host');
  const [selectedReviewAuction, setSelectedReviewAuction] = useState<PendingDelivery | null>(null);
  const [isMarkingDelivered, setIsMarkingDelivered] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    setIsDesktop(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (authenticated && user?.socialId) {
      console.log('Fetching pending deliveries for user:', user.socialId);
      fetchPendingDeliveries();
    } else {
      setLoading(false);
    }
  }, [authenticated, user?.socialId]);

  useEffect(() => {
    if (asHost.length > 0 && asWinner.length === 0) {
      setActiveView('host');
    } else if (asWinner.length > 0 && asHost.length === 0) {
      setActiveView('winner');
    } else if (asHost.length > 0) {
      setActiveView('host');
    }
  }, [asHost.length, asWinner.length]);

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
        setAsWinner(data.asWinner || []);
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
      setIsDrawerOpen(false);
      fetchPendingDeliveries();
    } catch (error: any) {
      console.error('Error marking as delivered:', error);
      toast.error(error.message || 'Failed to mark as delivered');
    } finally {
      setIsMarkingDelivered(null);
    }
  };

  const handleReviewSuccess = () => {
    handleCloseDrawer();
    fetchPendingDeliveries();
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedReviewAuction(null);
  };

  const totalCount = asHost.length + asWinner.length;

  if (loading || !authenticated || totalCount === 0) {
    return null;
  }

  if (isMobile == true) {
    return (
      <>
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="flex flex-col items-center justify-center flex-1"
        >
          <div className={`relative ${isDrawerOpen && "selected-gradient w-7 flex items-center justify-center aspect-square rounded-md"}`}>
            <Bell className={`w-5 h-5 mb-0.5 ${isDrawerOpen ? "text-white" : "text-white/60"}`} />
            {totalCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {totalCount}
              </span>
            )}
          </div>
          <span className={`text-[10px] ${isDrawerOpen ? "text-primary" : "text-white/60"}`}>
            Reviews
          </span>
        </button>
        {renderDrawer()}
      </>
    );
  }

  if(isMobile == false)
  return (
    <>
      <button
        onClick={() => setIsDrawerOpen(true)}
        className={`relative p-2 w-[48px] aspect-square flex items-center justify-center rounded-xl transition-all hover:scale-105 duration-200 ${
          isDrawerOpen
            ? "text-white selected-gradient"
            : "text-white hover:text-white hover:bg-white/10 bg-white/5"
        }`}
      >
        <Bell className={`${isDrawerOpen ? "text-white" : "text-white/30"} w-5 h-5`} />
        {totalCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {totalCount}
          </span>
        )}
      </button>
      {renderDrawer()}
    </>
  );

  function renderDrawer() {
    const content = (
      <>
        {!selectedReviewAuction && asHost.length > 0 && asWinner.length > 0 && (
          <div className="flex gap-2 p-1 mx-6 bg-white/10 rounded-lg">
            <button
              onClick={() => setActiveView('host')}
              className={`flex-1 py-2 px-4 rounded-md transition-all flex items-center justify-center gap-2 ${
                activeView === 'host'
                  ? 'bg-primary text-white'
                  : 'bg-transparent text-white/70 hover:text-white'
              }`}
            >
              <Package className="w-4 h-4" />
              Deliveries ({asHost.length})
            </button>
            <button
              onClick={() => setActiveView('winner')}
              className={`flex-1 py-2 px-4 rounded-md transition-all flex items-center justify-center gap-2 ${
                activeView === 'winner'
                  ? 'bg-primary text-white'
                  : 'bg-transparent text-white/70 hover:text-white'
              }`}
            >
              <Trophy className="w-4 h-4" />
              Won ({asWinner.length})
            </button>
          </div>
        )}
        
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {selectedReviewAuction ? (
            <ReviewForm
              auctionId={selectedReviewAuction.auctionId._id}
              auctionName={selectedReviewAuction.auctionId.auctionName}
              onSuccess={handleReviewSuccess}
              onCancel={() => setSelectedReviewAuction(null)}
              user={user}
            />
          ) : activeView === 'host' && asHost.length > 0 ? (
            asHost.map((delivery) => (
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
          ))
          ) : activeView === 'winner' && asWinner.length > 0 ? (
            asWinner.map((delivery) => (
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

                  <div className="flex gap-2">
                    <Button
                      onClick={() => router.push(`/user/${delivery.hostId?._id}`)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <User className="w-4 h-4 mr-1" />
                      Contact Host
                    </Button>
                    <Button
                      onClick={() => setSelectedReviewAuction(delivery)}
                      size="sm"
                      className="flex-1"
                    >
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Rate
                    </Button>
                  </div>
                </div>
              ))
          ) : null}
        </div>
      </>
    );

    return (
      !isDesktop ? (
        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle className="text-center gradient-text text-2xl">
                  {selectedReviewAuction ? 'Leave a Review' : 'Review Actions'}
                </DrawerTitle>
                <DrawerDescription className="text-center text-white/70">
                  {selectedReviewAuction 
                    ? 'Share your experience with this auction'
                    : 'Manage deliveries and reviews'}
                </DrawerDescription>
              </DrawerHeader>
              
              {content}

              {!selectedReviewAuction && (
                <DrawerFooter>
                  <DrawerClose asChild>
                    <Button variant="outline" onClick={handleCloseDrawer}>
                      Close
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              )}
            </DrawerContent>
          </Drawer>
      ) : (
        <Dialog open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle className="text-center gradient-text text-2xl">
                  {selectedReviewAuction ? 'Leave a Review' : 'Review Actions'}
                </DialogTitle>
                <DialogDescription className="text-center text-white/70">
                  {selectedReviewAuction 
                    ? 'Share your experience with this auction'
                    : 'Manage deliveries and reviews'}
                </DialogDescription>
              </DialogHeader>
              
              {content}

              {!selectedReviewAuction && (
                <DialogFooter>
                  <Button variant="outline" onClick={handleCloseDrawer}>
                    Close
                  </Button>
                </DialogFooter>
              )}
            </DialogContent>
          </Dialog>
      )
    );
  }
};

export default ReviewFlowManager;