'use client'

import { useState, useEffect } from 'react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from './Drawer'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './Dialog'
import { useGlobalContext } from '@/utils/providers/globalContext'
import { signOut } from 'next-auth/react'
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
  const navigateWithLoader = useNavigateWithLoader()
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    setIsDesktop(mediaQuery.matches)
    
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  const handleVisitProfile = () => {
    onClose()
    navigateWithLoader('/profile')
  }

  const handleLogout = () => {
    onClose()
    signOut()
  }

  return (
    !isDesktop ? (
      <Drawer open={isOpen} onOpenChange={onClose}>
          <DrawerContent className="bg-background/90 backdrop-blur-sm border-t border-line">
            <DrawerHeader className="flex flex-row items-center justify-between">
              <DrawerTitle className="text-white text-lg font-semibold">Profile</DrawerTitle>
              <DrawerClose asChild>
                <button className="text-primary-light hover:text-white transition-colors">
                  <RiCloseLine className="text-xl" />
                </button>
              </DrawerClose>
            </DrawerHeader>
            
            <div className="p-4 space-y-4">
              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={handleVisitProfile}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary-light hover:text-white transition-colors"
                >
                  <RiUserLine className="text-xl" />
                  <span className="text-md font-medium">Visit Profile</span>
                </button>
                
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-negative/10 hover:bg-negative/20 border border-negative/30 text-negative hover:text-negative transition-colors"
                >
                  <RiLogoutBoxLine className="text-xl" />
                  <span className="text-md font-medium">Logout</span>
                </button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
    ) : (
      <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-[400px] bg-background/90 backdrop-blur-sm border border-line">
            <DialogHeader>
              <DialogTitle className="text-white text-lg font-semibold">Profile</DialogTitle>
            </DialogHeader>
            
            <div className="py-4 space-y-4">
              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={handleVisitProfile}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary-light hover:text-white transition-colors"
                >
                  <RiUserLine className="text-xl" />
                  <span className="text-md font-medium">Visit Profile</span>
                </button>
                
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-negative/10 hover:bg-negative/20 border border-negative/30 text-negative hover:text-negative transition-colors"
                >
                  <RiLogoutBoxLine className="text-xl" />
                  <span className="text-md font-medium">Logout</span>
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
    )
  )
}