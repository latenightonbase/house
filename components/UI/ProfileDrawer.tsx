'use client'

import { useState } from 'react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from './Drawer'
import { useGlobalContext } from '@/utils/providers/globalContext'
import { usePrivy } from '@privy-io/react-auth'
import { useNavigateWithLoader } from '@/utils/useNavigateWithLoader'
import Image from 'next/image'
import { RiUserLine, RiLogoutBoxLine, RiCloseLine } from 'react-icons/ri'
import { MdWallet } from 'react-icons/md'

interface ProfileDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export default function ProfileDrawer({ isOpen, onClose }: ProfileDrawerProps) {
  const { user } = useGlobalContext()
  const { logout } = usePrivy()
  const navigateWithLoader = useNavigateWithLoader()

  const handleVisitProfile = () => {
    onClose()
    navigateWithLoader('/profile')
  }

  const handleLogout = () => {
    onClose()
    logout()
  }

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="bg-black/95 backdrop-blur-sm border-t border-primary/20">
        <DrawerHeader className="flex flex-row items-center justify-between">
          <DrawerTitle className="text-white text-lg font-semibold">Profile</DrawerTitle>
          <DrawerClose asChild>
            <button className="text-primary hover:text-white transition-colors">
              <RiCloseLine className="text-xl" />
            </button>
          </DrawerClose>
        </DrawerHeader>
        
        <div className="p-4 space-y-4">
          {/* Profile Info */}
          {/* <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-white/10">
            {user?.pfp_url ? (
              <Image
                alt="Profile Picture"
                src={user.pfp_url}
                width={48}
                height={48}
                className="w-12 h-12 aspect-square border border-primary rounded-lg"
              />
            ) : (
              <div className="w-12 h-12 aspect-square border border-primary rounded-lg bg-gray-600 flex items-center justify-center">
                <MdWallet className="text-lg text-primary" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-white font-medium">
                {user?.username || 'Anonymous User'}
              </span>
              <span className="text-caption text-sm">
                {user?.wallet_address ? `${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}` : 'No wallet connected'}
              </span>
            </div>
          </div> */}

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={handleVisitProfile}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary hover:text-white transition-colors"
            >
              <RiUserLine className="text-xl" />
              <span className="text-md font-medium">Visit Profile</span>
            </button>
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 transition-colors"
            >
              <RiLogoutBoxLine className="text-xl" />
              <span className="text-md font-medium">Logout</span>
            </button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}