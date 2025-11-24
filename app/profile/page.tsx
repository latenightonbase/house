'use client'

import { useGlobalContext } from '@/utils/providers/globalContext'
import { usePrivy } from '@privy-io/react-auth'
import Image from 'next/image'
import { MdWallet } from 'react-icons/md'
import { RiUserLine, RiAuctionLine, RiMedalLine, RiCalendarLine, RiTwitterLine, RiLoader5Fill } from 'react-icons/ri'
import { useNavigateWithLoader } from '@/utils/useNavigateWithLoader'
import { useState, useEffect } from 'react'
import TwitterAuthModal from '@/components/UI/TwitterAuthModal'
import { useMiniKit } from '@coinbase/onchainkit/minikit'

interface UserProfile {
  _id: string
  wallet: string
  username?: string
  fid?: string
  pfp_url: string
  display_name: string
  hasTwitterProfile: boolean
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
  auctionsCreated: number
  auctionsWon: number
  totalBids: number
  totalVolume: number
  activeAuctions: number
}

export default function ProfilePage() {
  const { user } = useGlobalContext()
  const { authenticated } = usePrivy()
  const navigateWithLoader = useNavigateWithLoader()
  const [profileData, setProfileData] = useState<UserProfile | null>(null)
  const [statistics, setStatistics] = useState<ProfileStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTwitterModal, setShowTwitterModal] = useState(false)

  const {context} = useMiniKit()

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return
      
      try {
        setLoading(true)
        const response = await fetch('/api/users/profile')
        const data = await response.json()

        if (data.success) {
          console.log('Profile data received:', data.user)
          setProfileData(data.user)
          setStatistics(data.statistics)
        }
      } catch (error) {
        console.error('Error fetching profile data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfileData()
  }, [authenticated])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
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
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl p-6 max-lg:p-4 pt-20 lg:pt-6">
        {/* Profile Header */}
        <div className="bg-black/50 rounded-xl border border-primary/20 p-6 mb-6">
          <div className="flex max-lg:flex-col items-center max-lg:justify-center gap-6 max-lg:gap-2">
            {user?.pfp_url ? (
              <Image
              unoptimized
                alt="Profile Picture"
                src={profileData?.twitterProfile?.profileImageUrl || user.pfp_url}
                width={540}
                height={540}
                className="w-16 h-16 lg:w-32 lg:h-32 aspect-square border-2 border-primary rounded-xl"
              />
            ) : (
              <div className="w-24 h-24 lg:w-32 lg:h-32 aspect-square border-2 border-primary rounded-xl bg-gray-600 flex items-center justify-center">
                <MdWallet className="text-4xl text-primary" />
              </div>
            )}
            
            <div className="flex-1 max-lg:text-center">
              <h1 className="text-2xl font-bold text-white mb-2">
                {profileData?.twitterProfile?.username  || 'Anonymous User'}
              </h1>
              <p className="text-caption text-sm lg:text-base mb-4">
                Wallet: {profileData?.wallet ? `${profileData.wallet.slice(0, 8)}...${profileData.wallet.slice(-6)}` : 'Not connected'}
              </p>
              
              {/* Twitter Profile Section */}
              {/* <div className="flex flex-wrap gap-4 text-sm mb-4">
                <div className="flex items-center gap-2 text-primary">
                  <RiCalendarLine />
                  <span>Member since {new Date(profileData?.createdAt || '').getFullYear() || new Date().getFullYear()}</span>
                </div>
              </div> */}
              
              {/* Twitter Status */}
              {!context && <div className="flex items-center gap-4">
                {profileData?.twitterProfile?.id ? (
                  <div className="flex items-center gap-2 text-green-400">
                    <RiTwitterLine />
                    <span className="text-sm">Twitter linked: @{profileData.twitterProfile?.username}</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowTwitterModal(true)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:text-blue-300 transition-colors text-sm"
                  >
                    <RiTwitterLine />
                    <span>Link Twitter</span>
                  </button>
                )}
              </div>}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button
            onClick={() => navigateWithLoader('/my-auctions')}
            className="bg-black/50 border border-primary/20 rounded-xl flex items-center gap-2 justify-center p-6 hover:bg-primary/10 hover:border-primary/40 transition-colors group"
          >
            <RiAuctionLine className="text-3xl text-primary group-hover:scale-110 transition-transform" />
            <div>
              <h3 className="text-white font-semibold">My Auctions</h3>
            </div>
            
          </button>
          
          <button
            onClick={() => navigateWithLoader('/won-bids')}
            className="bg-black/50 border border-primary/20 rounded-xl flex items-center gap-2 justify-center p-6 hover:bg-primary/10 hover:border-primary/40 transition-colors group"
          >
            <RiMedalLine className="text-3xl text-primary group-hover:scale-110 transition-transform" />
            <div>
              <h3 className="text-white font-semibold">Won Auctions</h3>
            </div>
          </button>
          
          <button
            onClick={() => navigateWithLoader('/create')}
            className="bg-black/50 border border-primary/20 rounded-xl flex items-center gap-2 justify-center p-6 hover:bg-primary/10 hover:border-primary/40 transition-colors group"
          >
            <RiUserLine className="text-3xl text-primary group-hover:scale-110 transition-transform" />
            <div>
              <h3 className="text-white font-semibold">Create Auction</h3>
            </div>
          </button>
        </div>

        {/* Profile Stats */}
        <div className="bg-black/50 rounded-xl border border-primary/20 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Profile Statistics</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center bg-primary/5 py-4 rounded-lg">
              <div className="text-2xl font-bold text-primary mb-1">{profileData?.hostedAuctions.length || 0}</div>
              <div className="text-caption text-sm">Auctions Created</div>
            </div>
            <div className="text-center bg-primary/5 py-4 rounded-lg">
              <div className="text-2xl font-bold text-primary mb-1">{profileData?.bidsWon.length || 0}</div>
              <div className="text-caption text-sm">Auctions Won</div>
            </div>
            {/* <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-1">{statistics?.totalBids || 0}</div>
              <div className="text-caption text-sm">Total Bids</div>
            </div> */}
            {/* <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-1">{formatVolume(statistics?.totalVolume || 0)}</div>
              <div className="text-caption text-sm">Total Volume</div>
            </div> */}
          </div>
        </div>
        
        <TwitterAuthModal 
          isOpen={showTwitterModal}
          onClose={() => setShowTwitterModal(false)}
          onSuccess={() => {
            setShowTwitterModal(false);
            // Refresh profile data after successful Twitter linking
            window.location.reload();
          }}
        />
      </div>
    </div>
  )
}