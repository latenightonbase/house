'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { RiLoader5Fill, RiArrowLeftLine, RiUserLine } from 'react-icons/ri'
import Heading from '@/components/UI/Heading'
import UserAuctions from '@/components/UserAuctions'
import ReviewList from '@/components/ReviewList'
import { useMiniKit } from '@coinbase/onchainkit/minikit'
import { sdk } from '@farcaster/miniapp-sdk'

interface UserData {
  user: {
    _id: string
    wallet: string
    fid?: string
    username?: string
    pfp_url?: string | null
    display_name?: string | null
    bio?: string | null
    x_username?: string | null
  }
  activeAuctions: any[]
  endedAuctions: any[]
}

export default function UserPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.userId as string

  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const {context} = useMiniKit()

  const handleViewProfile = async () => {
    if (context && userData?.user.fid) {
      try {
        await sdk.actions.viewProfile({ 
          fid: parseInt(userData.user.fid)
        })
      } catch (error) {
        console.error('Error viewing profile:', error)
      }
    }
  }

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/users/${userId}/auctions`)
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('User not found')
          }
          throw new Error('Failed to fetch user data')
        }

        const data = await response.json()
        setUserData(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      fetchUserData()
    }
  }, [userId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RiLoader5Fill className="text-primary animate-spin text-3xl mx-auto" />
          <p className="mt-4 text-caption">Loading user profile...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-80 transition-opacity"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-caption">No user data found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 max-lg:pt-4">
      <div className="max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-caption hover:text-white transition-colors mb-6"
        >
          <RiArrowLeftLine className="text-xl" />
          <span>Back</span>
        </button>

        {/* User Header */}
        <div className="bg-white/10 rounded-lg shadow-md lg:p-4 p-2 mb-8 border border-white/10">
          <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex max-lg:flex-col items-center justify-between gap-2">
                <div>
                    <div className="flex items-center gap-2">
                        {/* Profile Picture */}
                {userData.user.pfp_url && (
                <img 
                    src={userData.user.pfp_url} 
                    alt={userData.user.username || 'User'} 
                    className="w-10 h-10 aspect-square rounded-full border-2 border-primary/30"
                />
                )}
                    <Heading size="sm" className="max-lg:w-36 truncate">
                        {userData.user.display_name || (userData.user.username ? `@${userData.user.username}` : 'User Profile')}
                    </Heading>
                    
                    </div>
                    {userData.user.bio && (
                <p className="text-white/80 text-sm my-3 line-clamp-2">{userData.user.bio}</p>
              )}
              <div className='flex gap-2 w-full items-center justify-center'>
                {userData.user.x_username && (
                <div className="">
                  <a 
                    href={`https://x.com/${userData.user.x_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs bg-white/10 border border-white/20 rounded-md p-2 text-white font-bold transition-colors"
                  >
                    @{userData.user.x_username}
                    <svg 
                      className="w-3 h-3" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}
                {context && userData.user.fid && (
                    <button
                      onClick={handleViewProfile}
                      className="flex items-center gap-2 px-3 py-1.5 bg-primary/20 border border-primary/30 text-primary rounded-lg hover:bg-primary/30 transition-colors text-sm font-medium"
                    >
                      <RiUserLine className="text-sm" />
                      Profile
                    </button>
                  )}

              </div>
                    
                </div>
                <div className="lg:text-right text-center flex flex-col items-center gap-2">
                  {/* View Profile Button - only show if context is available and user has fid */}
                  
                  <div>
                    <p className="text-caption text-xs">Total Auctions</p>
                    <p className="text-2xl font-bold text-primary">
                      {userData.activeAuctions.length + userData.endedAuctions.length}
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Auctions */}
        <UserAuctions 
          activeAuctions={userData.activeAuctions}
          endedAuctions={userData.endedAuctions}
        />

        {/* Reviews Section */}
        <div className="mt-8">
          <ReviewList userId={userId} />
        </div>
      </div>
    </div>
  )
}

