import { useGlobalContext } from '@/utils/providers/globalContext';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import Image from 'next/image';
import { MdWallet } from 'react-icons/md';
import { CiLogin } from "react-icons/ci";
import { useState } from 'react';
import ProfileDrawer from '../UI/ProfileDrawer';
import { FaXTwitter } from 'react-icons/fa6';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '../UI/Drawer';
import { Button } from '../UI/button';

interface WalletConnectProps {
  onProfileClick?: () => void;
}

export const WalletConnect = ({ onProfileClick }: WalletConnectProps = {}) => {
  const { user, isFarcasterContext } = useGlobalContext();
  const { ready, authenticated, login, logout, user: privyUser, connectWallet } = usePrivy();
  const { wallets } = useWallets();
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [isWalletDrawerOpen, setIsWalletDrawerOpen] = useState(false);

  // Get Twitter account from Privy
  const twitterAccount = privyUser?.linkedAccounts?.find(
    (account: any) => account.type === 'twitter_oauth'
  ) as any;

  const hasWallet = wallets.length > 0;

  console.log("TWITTER ACCOUNT:", twitterAccount);

  const handleProfileClick = () => {
    if (onProfileClick) {
      onProfileClick();
    } else {
      setIsProfileDrawerOpen(true);
    }
  };

  const handleLogin = () => {
    login();
  };

  const handleWalletClick = () => {
    setIsWalletDrawerOpen(true);
  };

  const handleConnectWallet = async () => {
    try {
      await connectWallet();
      setIsWalletDrawerOpen(false);
    } catch (error) {
      console.error('Wallet connection error:', error);
    }
  };

  const handleDisconnectWallet = async () => {
    try {
      if (wallets.length > 0) {
        // Unlink the wallet
        await wallets[0].disconnect();
        setIsWalletDrawerOpen(false);
      }
    } catch (error) {
      console.error('Wallet disconnect error:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Show loading state
  if (!ready) {
    return (
      <div
        style={{
          opacity: 0,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <button
          type="button"
          className="text-center w-full flex gap-1 px-2 max-lg:py-1 py-3 gradient-button items-center justify-center rounded text-md font-bold text-white"
          disabled
        >
          Loading...
        </button>
      </div>
    );
  }

  // Not connected - show login button
  if (!authenticated) {
    return (
      <>
        <button
          onClick={handleLogin}
          type="button"
          className="text-center w-full flex gap-1 px-2 max-lg:py-1 py-3 gradient-button items-center justify-center rounded text-md font-bold text-white"
        >
          Login<CiLogin className='text-xl'/>
        </button>
      </>
    );
  }

  // Connected - show Twitter account and wallet connection
  return (
    <>
      <div className='flex items-center justify-between gap-2 h-10'>
        {/* Twitter Account Display */}
        {twitterAccount && (
          <button
            onClick={handleProfileClick}
            type="button"
            className="flex bg-primary/10 flex-1 h-10 lg:p-2 items-center gap-2 text-center rounded-lg text-md font-bold text-white hover:bg-primary/20 transition-colors"
          >
            <div className='flex items-center gap-2'>
              <Image unoptimized
                alt="X Profile Picture"
                src={twitterAccount.profilePictureUrl || `https://api.dicebear.com/5.x/identicon/svg?seed=${twitterAccount.username}`}
                width={40}
                height={40}
                className="lg:w-8 lg:h-8 h-6 w-6 aspect-square border border-primary rounded-full object-cover"
              />
              <div className='flex flex-col text-left max-lg:hidden'>
                <span className='text-sm font-medium'>
                  @{twitterAccount.username || twitterAccount.name || 'X Account'}
                </span>
              </div>
            </div>
          </button>
        )}

        {/* Independent Wallet Connection Button */}
        <button
          onClick={handleWalletClick}
          type="button"
          className={`flex gap-1 p-2 h-10 items-center justify-center rounded-lg text-sm font-bold text-white whitespace-nowrap transition-opacity ${
            !hasWallet 
              ? 'gradient-button hover:opacity-90' 
              : 'bg-white/10 hover:bg-white/20'
          }`}
        >
          <MdWallet className='text-lg' />
          {/* <span className='max-lg:hidden'>
            {!hasWallet ? 'Connect Wallet' : `${wallets[0]?.address.slice(0, 6)}...${wallets[0]?.address.slice(-4)}`}
          </span> */}
        </button>

        {/* Show user profile if it exists and no Twitter */}
        {!twitterAccount && user && user?.pfp_url !== "" && user?.username !== "" && (
          <button
            onClick={handleProfileClick}
            type="button"
            className="flex bg-primary/10 lg:p-2 items-center gap-2 text-center rounded-lg text-md font-bold text-white hover:bg-primary/20 transition-colors"
          >
            <div className='flex items-center gap-2'>
              <Image unoptimized
                alt="Profile Picture"
                src={user?.pfp_url}
                width={40}
                height={40}
                className="lg:w-8 lg:h-8 h-6 w-6 aspect-square border border-primary rounded-md"
              />
              <div className='flex flex-col text-left max-lg:hidden'>
                <span className='text-sm font-medium'>{user?.username}</span>
              </div>
            </div>
          </button>
        )}
      </div>
      
      <ProfileDrawer 
        isOpen={isProfileDrawerOpen} 
        onClose={() => setIsProfileDrawerOpen(false)} 
      />

      {/* Wallet Management Drawer */}
      <Drawer open={isWalletDrawerOpen} onOpenChange={setIsWalletDrawerOpen}>
        <DrawerContent className="drawer-content">
          <DrawerHeader>
            <DrawerTitle className="text-xl gradient-text">
              {hasWallet ? 'Wallet Connected' : 'Connect Wallet'}
            </DrawerTitle>
            <DrawerDescription className="text-white/70">
              {hasWallet 
                ? 'Manage your connected wallet' 
                : 'Connect your wallet to place bids and create auctions'}
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="px-4 pb-4">
            {hasWallet ? (
              <div className="space-y-4">
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                      <MdWallet className="text-white text-xl" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white/70">Connected Wallet</p>
                      <p className="text-white font-medium">
                        {wallets[0]?.address.slice(0, 8)}...{wallets[0]?.address.slice(-6)}
                      </p>
                    </div>
                  </div>
                </div>
                
                <Button
                  onClick={handleDisconnectWallet}
                  variant="destructive"
                  className="w-full"
                >
                  Disconnect Wallet
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <MdWallet className="text-6xl text-primary mx-auto mb-4" />
                  <p className="text-white/70 mb-4">
                    Connect your wallet to start bidding and creating auctions
                  </p>
                </div>
                
                <Button
                  onClick={handleConnectWallet}
                  className="w-full h-12 gradient-button text-white font-bold"
                >
                  <MdWallet className="text-xl mr-2" />
                  Connect Wallet
                </Button>
              </div>
            )}
          </div>

          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline" className="w-full">
                Close
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
};