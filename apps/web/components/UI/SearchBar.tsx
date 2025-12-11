'use client'

import { useState, useEffect, useRef } from 'react'
import { RiLoader5Fill, RiSearchLine, RiCloseLine } from 'react-icons/ri'
import { useRouter } from 'next/navigation'

interface User {
  _id: string
  wallet: string
  fid?: string
  username?: string
  pfp_url?: string
}

export default function SearchBar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isAnimatingOut, setIsAnimatingOut] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([])
        return
      }

      setIsSearching(true)
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`)
        if (response.ok) {
          const data = await response.json()
          setSearchResults(data.users || [])
        }
      } catch (error) {
        console.error('Error searching users:', error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }

    const timeoutId = setTimeout(searchUsers, 500)
    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const handleUserClick = (userId: string) => {
    router.push(`/user/${userId}`)
    handleClose()
  }

  const handleClose = () => {
    setIsAnimatingOut(true)
    setTimeout(() => {
      onClose()
      setSearchQuery('')
      setSearchResults([])
      setIsAnimatingOut(false)
    }, 300)
  }

  if (!isOpen && !isAnimatingOut) return null

  return (
    <div className={`fixed inset-0 z-[100] transition-opacity duration-300 ${
      isOpen && !isAnimatingOut ? 'opacity-100' : 'opacity-0'
    }`}>
      {/* Blur Background */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-all duration-300"
        onClick={handleClose}
      />

      {/* Search Bar Container */}
      <div className={`relative z-[101] max-w-2xl mx-auto pt-10 px-4 transition-all duration-300 ${
        isOpen && !isAnimatingOut 
          ? 'translate-y-0 opacity-100' 
          : '-translate-y-10 opacity-0'
      }`}>
        <div className="bg-black/90 border border-primary/30 rounded-lg shadow-2xl shadow-primary/20">
          {/* Search Input */}
          <div className="flex items-center gap-3 p-4 border-b border-white/10">
            <RiSearchLine className="text-primary text-2xl" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users by username, wallet, or FID..."
              className="flex-1 bg-transparent text-white placeholder-caption focus:outline-none text-lg"
            />
            {isSearching && <RiLoader5Fill className="text-primary animate-spin text-xl" />}
            <button
              onClick={handleClose}
              className="text-caption hover:text-white transition-colors"
            >
              <RiCloseLine className="text-2xl" />
            </button>
          </div>

          {/* Search Results */}
          <div className="max-h-96 overflow-y-auto">
            {searchQuery.trim() && !isSearching && searchResults.length === 0 && (
              <div className="p-8 text-center text-caption">
                No users found
              </div>
            )}

            {searchResults.map((user) => (
              <div
                key={user._id}
                onClick={() => handleUserClick(user._id)}
                className="p-4 hover:bg-white/10 cursor-pointer border-b border-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {user.pfp_url && (
                    <img 
                      src={user.pfp_url} 
                      alt={user.username || 'User'} 
                      className="w-10 h-10 rounded-full border border-primary/20"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    {user.username && (
                      <p className="text-white font-bold text-lg truncate">
                        @{user.username}
                      </p>
                    )}
                    <p className="text-caption text-xs truncate">
                      {user.wallet.slice(0, 6)}...{user.wallet.slice(-4)}
                    </p>
                  </div>
                  <div className="text-primary text-sm ml-4 whitespace-nowrap">View Profile</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

