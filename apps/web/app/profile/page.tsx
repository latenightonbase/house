'use client'

import { useGlobalContext } from '@/utils/providers/globalContext'
import { getAccessToken, usePrivy, useWallets } from '@privy-io/react-auth'
import Image from 'next/image'
import Heading from '@/components/UI/Heading'
import RatingCircle from '@/components/UI/RatingCircle'
import { MdWallet } from 'react-icons/md'
import { RiUserLine, RiAuctionLine, RiMedalLine, RiCalendarLine, RiTwitterLine, RiLoader5Fill } from 'react-icons/ri'
import { useNavigateWithLoader } from '@/utils/useNavigateWithLoader'
import { useState, useEffect } from 'react'
import TwitterAuthModal from '@/components/UI/TwitterAuthModal'
import { useMiniKit } from '@coinbase/onchainkit/minikit'
import ReviewCard from '@/components/UI/ReviewCard'
import ScrollingName from '@/components/utils/ScrollingName'

interface Bid {
  _id: string
  bidAmount: number
  usdcValue: number
  currency: string
  bidTimestamp: string
  auction: {
    _id: string
    auctionName: string
    blockchainAuctionId: string
    imageUrls?: string[]
  }
}

interface Review {
  _id: string
  rating: number
  comment?: string
  reviewer: {
    _id: string
    username?: string
    pfp_url?: string
    twitterProfile?: {
      username: string
      profileImageUrl?: string
    }
    wallets: string[]
  }
  auction: {
    _id: string
    auctionName: string
    blockchainAuctionId: string
  }
  createdAt: string
}

interface UserProfile {
  _id: string
  wallets: string[]
  username?: string
  socialId?: string
  socialPlatform?: string
  fid?: string
  pfp_url: string
  display_name: string
  averageRating?: number
  totalReviews?: number
  twitterProfile?: {
    id: string
    username: string
    name: string
    profileImageUrl?: string
  }
  hostedAuctions: string[]
  bidsWon: string[]
  participatedAuctions: string[]
  createdAt: string
}

interface ProfileStatistics {
  totalTradingVolume: number
  activeAuctions: number
  totalBids: number
}

export default function ProfilePage() {
  const { user } = useGlobalContext()
  const { authenticated } = usePrivy()
  const { wallets } = useWallets()
  const navigateWithLoader = useNavigateWithLoader()
  const [profileData, setProfileData] = useState<UserProfile | null>(null)
  const [statistics, setStatistics] = useState<ProfileStatistics | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [recentBids, setRecentBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)
  const [showTwitterModal, setShowTwitterModal] = useState(false)

  const {context} = useMiniKit()

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!authenticated) {
        console.log('User not authenticated, skipping profile data fetch');
        return;
      }
      
      try {
        setLoading(true)
        const accessToken = await getAccessToken();
        console.log("Fetching profile data with user socialId", user.socialId);
        const response = await fetch('/api/users/profile?socialId=' + (user?.socialId),{
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        })
        const data = await response.json()

        console.log('Profile data fetched:', data)

        if (data.success) {
          console.log('Profile data received:', data.user)
          setProfileData(data.user)
          setStatistics(data.statistics)
          
          // Fetch reviews
          const reviewsResponse = await fetch(`/api/reviews/user/${data.user._id}`)
          const reviewsData = await reviewsResponse.json()
          if (reviewsData.success) {
            setReviews(reviewsData.reviews)
          }

          // Fetch recent bids
          const bidsResponse = await fetch(`/api/users/bids?userId=${data.user._id}&limit=5`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          })
          const bidsData = await bidsResponse.json()
          if (bidsData.success) {
            setRecentBids(bidsData.bids)
          }
        }
      } catch (error) {
        console.error('Error fetching profile data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfileData()
  }, [authenticated, user])

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Heading size="md" gradient={false} className="text-white mb-4">Access Denied</Heading>
          <p className="text-caption">Please login to view your profile.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RiLoader5Fill className='text-primary animate-spin text-4xl mb-4 mx-auto' />
          <p className="text-caption">Loading profile...</p>
        </div>
      </div>
    )
  }

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(1)}M`
    } else if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(1)}K`
    } else {
      return `$${volume.toFixed(2)}`
    }
  }

  return (
    <div className="min-h-screen ">
      <div className="max-w-5xl mx-auto pt-4 lg:pt-6 max-lg:pb-20">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl border border-primary/30 lg:p-8 p-2 mb-6">
          <div className="flex max-lg:flex-col items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              {user?.pfp_url ? (
                <Image
                  unoptimized
                  alt="Profile Picture"
                  src={profileData?.twitterProfile?.profileImageUrl || user.pfp_url}
                  width={120}
                  height={120}
                  className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl border-2 border-primary shadow-lg"
                />
              ) : (
                <div className="w-20 h-20 lg:w-24 lg:h-24 border-2 border-primary rounded-2xl bg-white/10 flex items-center justify-center">
                  <MdWallet className="text-4xl text-primary" />
                </div>
              )}
              
              <div>
                <div className="flex items-center lg:gap-3 gap-1 mb-2">
                  <ScrollingName
                    name={profileData?.twitterProfile?.name || user.username || 'Art Collector'}
                    className="text-3xl max-lg:text-xl font-bold text-white max-lg:w-36 max-w-80"
                  />
                  {profileData?.averageRating && profileData.averageRating > 0 && (
                    <RatingCircle
                      rating={profileData.averageRating}
                      totalReviews={profileData.totalReviews || 0}
                      size="sm"
                      showLabel={false}
                    />
                  )}
                </div>
                <p className="text-secondary mb-2 text-sm">
                  @{profileData?.twitterProfile?.username || user.username || 'artcollector'}
                </p>
                <div className="flex flex-wrap gap-3">
                  {!context && profileData && profileData?.wallets.length > 0 && (
                    <span className="text-xs bg-white/10 px-3 py-1 rounded-full text-gray-300">
                      {profileData.wallets[0].slice(0, 6)}...{profileData.wallets[0].slice(-4)}
                    </span>
                  )}
                  {profileData?.twitterProfile?.username && (
                    <a 
                      href={`https://twitter.com/${profileData.twitterProfile.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full hover:bg-blue-500/30 transition-colors flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      @{profileData.twitterProfile.username}
                    </a>
                  )}
                  {/* {!context && (
                    <button className="text-xs bg-white/10 text-gray-300 px-3 py-1 rounded-full hover:bg-gray-600 transition-colors">
                      🔔 Enable Notifications
                    </button>
                  )} */}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 max-lg:w-full max-lg:justify-center">
              <button
                onClick={() => navigateWithLoader('/my-auctions')}
                className="px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                My Auctions
              </button>
              <button
                onClick={() => navigateWithLoader('/won-bids')}
                className="px-6 py-3 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/10 transition-colors"
              >
                Won Bids
              </button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Statistics</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="bg-white/10 rounded-xl lg:p-6 p-4 border border-white/10">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-3">
                <RiAuctionLine className="text-2xl text-purple-400" />
              </div>
              <div className="text-3xl max-lg:text-2xl font-bold text-white mb-1">{profileData?.hostedAuctions.length || 0}</div>
              <div className="text-sm text-gray-400">Auctions Created</div>
            </div>

            <div className="bg-white/10 rounded-xl lg:p-6 p-4 border border-white/10">
              <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center mb-3">
                <RiMedalLine className="text-2xl text-pink-400" />
              </div>
              <div className="text-3xl max-lg:text-2xl font-bold text-white mb-1">{profileData?.bidsWon.length || 0}</div>
              <div className="text-sm text-gray-400">Auctions Won</div>
            </div>

            <div className="bg-white/10 rounded-xl lg:p-6 p-4 border border-white/10">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="text-3xl max-lg:text-2xl font-bold text-white mb-1">{statistics?.totalBids || 0}</div>
              <div className="text-sm text-gray-400">Total Bids</div>
            </div>

            <div className="bg-white/10 rounded-xl lg:p-6 p-4 border border-white/10">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="text-3xl max-lg:text-2xl font-bold text-white mb-1">{statistics?.activeAuctions || 0}</div>
              <div className="text-sm text-gray-400">Active Auctions</div>
            </div>
          </div>

          {/* Total Trading Volume */}
          <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-xl lg:p-6 p-4 border border-green-500/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-400 mb-1">Total Trading Volume</div>
                <div className="lg:text-4xl text-2xl font-bold text-white">{formatVolume(statistics?.totalTradingVolume || 0)}</div>
                <div className="text-sm text-gray-400 mt-1">Across all auctions</div>
              </div>
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        {reviews.length > 0 && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-4">Reviews ({reviews.filter(r => r.auction).length})</h2>
            <div className="bg-secondary/10 rounded-xl border border-secondary/10 lg:p-6 p-4">
              <div className="space-y-4">
              {reviews.filter(review => review.auction).map((review) => (
                <ReviewCard
                  key={review._id}
                  rating={review.rating}
                  comment={review.comment}
                  reviewerId={review.reviewer._id}
                  reviewerName={
                    review.reviewer.twitterProfile?.username || 
                    review.reviewer.username || 
                    `${review.reviewer.wallets[0]?.slice(0, 6)}...${review.reviewer.wallets[0]?.slice(-4)}`
                  }
                  reviewerPfp={
                    review.reviewer.twitterProfile?.profileImageUrl ||
                    review.reviewer.pfp_url ||
                    null
                  }
                  auctionName={review.auction.auctionName}
                  createdAt={review.createdAt}
                />
              ))}
            </div>
          </div>
          </div>
        )}

        {/* Recent Activity */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Recent Activity</h2>
          <div className="bg-secondary/10 rounded-xl border border-secondary/10 lg:p-6 p-4">
            {recentBids.length > 0 ? (
              <div className="space-y-4">
                {recentBids.map((bid) => (
                  <div
                    key={bid._id}
                    onClick={() => navigateWithLoader(`/bid/${bid.auction.blockchainAuctionId}`)}
                    className="bg-primary/5 rounded-xl p-4 border border-primary/10 hover:bg-primary/10 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {bid.auction.imageUrls && bid.auction.imageUrls.length > 0 && (
                          <Image
                            unoptimized
                            src={bid.auction.imageUrls[0]}
                            alt={bid.auction.auctionName}
                            width={60}
                            height={60}
                            className="w-15 h-15 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <p className="text-white font-semibold">{bid.auction.auctionName}</p>
                          <p className="text-sm text-gray-400">
                            {new Date(bid.bidTimestamp).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold">${bid.usdcValue.toFixed(2)}</p>
                        <p className="text-sm text-gray-400">{bid.bidAmount} {bid.currency}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-6">
                <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-lg">No recent activity</p>
              </div>
            )}
          </div>
        </div>
        
        <TwitterAuthModal 
          isOpen={showTwitterModal}
          onClose={() => setShowTwitterModal(false)}
          onSuccess={() => {
            setShowTwitterModal(false);
            window.location.reload();
          }}
        />
      </div>
    </div>
  )
}