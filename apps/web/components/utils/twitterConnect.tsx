import { useLogin, usePrivy, useWallets, useConnectWallet } from '@privy-io/react-auth';
import Image from 'next/image';
import { MdWallet, MdLogout, MdMoreVert } from 'react-icons/md';
import { useState, useRef, useEffect } from 'react';

export default function LoginWithOAuth() {
  const { user, authenticated, logout, getAccessToken } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { connectWallet } = useConnectWallet({
    onSuccess: async ({ wallet }) => {
      if (wallet?.address && user) {
        await handleAddWallet(wallet.address);
      }
    }
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Disconnect all external wallets before connecting a new one
  const disconnectAllWallets = async () => {
    const externalWallets = wallets.filter(
      wallet => wallet.walletClientType !== 'privy'
    );
    for (const wallet of externalWallets) {
      await wallet.disconnect();
    }
  };

  const handleConnectWallet = async () => {
    await disconnectAllWallets();
    connectWallet();
    setMenuOpen(false);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const handleAddWallet = async (walletAddress: string) => {
    try {
      const accessToken = await getAccessToken();
      const response = await fetch('/api/protected/user/add-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          socialId: user?.twitter?.subject,
          walletAddress,
        }),
      });

      if (!response.ok) {
        console.error('Failed to add wallet to database');
      } else {
        console.log('Wallet added successfully');
      }
    } catch (error) {
      console.error('Error adding wallet:', error);
    }
  };

  
  const { login } = useLogin({
    onComplete: async ({ user, isNewUser, wasAlreadyAuthenticated, loginMethod, loginAccount }) => {
      console.log('User logged in successfully', user);
      if (isNewUser && user.twitter?.subject) {
        console.log('New user detected, creating user in database');
        try {
          const accessToken = await getAccessToken();
          const response = await fetch('/api/protected/user/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              privyId: user.id,
              socialId: user.twitter?.subject,
              socialPlatform: 'TWITTER',
              walletAddress: user.wallet?.address,
              twitterProfile: user.twitter ? {
                id: user.twitter.subject,
                username: user.twitter.username,
                name: user.twitter.name,
                profileImageUrl: user.twitter.profilePictureUrl,
              } : undefined,
            }),
          });

          if (!response.ok) {
            console.error('Failed to create user');
          } else {
            const data = await response.json();
            console.log('User created successfully:', data);
          }
        } catch (error) {
          console.error('Error creating user:', error);
        }
      }
      
      // Save Twitter profile to database if Twitter was linked
      if (user?.twitter && !wasAlreadyAuthenticated) {
        try {
          const accessToken = await getAccessToken();
          const response = await fetch('/api/protected/user/save-twitter-profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              twitterProfile: {
                id: user.twitter.subject,
                username: user.twitter.username,
                name: user.twitter.name,
                profileImageUrl: user.twitter.profilePictureUrl,
              },
            }),
          });

          if (!response.ok) {
            console.error('Failed to save Twitter profile');
          } else {
            console.log('Twitter profile saved successfully');
          }
        } catch (error) {
          console.error('Error saving Twitter profile:', error);
        }
      }
    },
    onError: (error) => {
      console.error('Login failed', error);
    }
  });

  const handleTwitterLogin = () => {
    // Opens Privy's login modal with Twitter as the login method
    login({ loginMethods: ['twitter']});
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  // Check if user is authenticated and has Twitter profile
  const twitterAccount = user?.twitter;
  
  // Get connected external wallets (not embedded wallets) - only use the first one
  const externalWallets = wallets.filter(
    wallet => wallet.walletClientType !== 'privy'
  );
  const connectedWallet = externalWallets.length > 0 ? externalWallets[0] : null;

  return (
      <div className="flex flex-col gap-3 relative">
          {authenticated && twitterAccount ? (
              <>
                {/* Twitter Account Display */}
                <div className="relative" ref={menuRef}>
                  <div 
                    className="flex items-center justify-between gap-2 bg-white/10 px-3 py-2 max-lg:p-1 rounded-full cursor-pointer hover:bg-white/20 transition-colors"
                    onClick={() => setMenuOpen(!menuOpen)}
                  >
                      <div className="flex items-center lg:gap-2 relative">
                        {twitterAccount.profilePictureUrl && (
                            <Image
                            unoptimized
                                src={twitterAccount.profilePictureUrl}
                                alt={twitterAccount.username || 'Twitter Profile'}
                                width={32}
                                height={32}
                                className="rounded-full w-11 max-lg:w-8 aspect-square bg-primary/50 border-2 border-primary"
                            />
                        )}
                        <div className=" max-lg:w-0">
                          <span className="text-sm font-medium max-lg:hidden">
                            @{twitterAccount.username}
                        </span>
                        {connectedWallet ? (
                          <div className="flex items-center justify-between gap-2 rounded-full max-lg:hidden">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-primary">
                                {connectedWallet.address.slice(0, 6)}...{connectedWallet.address.slice(-4)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 bg-red-500/80 text-nowrap text-xs px-2 py-1 absolute max-lg:-left-12 left-10 -top-8 animate-bounce max-lg:top-full mt-2 rounded-full">
                            <MdWallet className="text-sm" />
                            Not Connected
                          </div>
                        )}
                          
                        </div>
                        
                      </div>
                      <button
                        className="p-1 hover:bg-white/10 rounded-full max-lg:hidden transition-colors"
                        title="More options"
                      >
                        <MdMoreVert className="text-lg" />
                      </button>
                  </div>

                  {/* Dropdown Menu */}
                  {menuOpen && (
                    <div className="absolute right-0 bottom-full max-lg:top-full max-lg:bottom-auto mb-2 max-lg:mt-2 bg-black/90 border border-primary/20 backdrop-blur-md rounded-lg shadow-lg overflow-hidden z-50 min-w-[200px]">
                      {/* User Info - Mobile Only */}
                      <div className="lg:hidden px-4 py-3 border-b border-white/10">
                        <div className="text-sm font-medium mb-1">
                          @{twitterAccount.username}
                        </div>
                        {connectedWallet && (
                          <div className="text-sm text-green-500">
                            {connectedWallet.address.slice(0, 6)}...{connectedWallet.address.slice(-4)}
                          </div>
                        )}
                      </div>
                      
                      {connectedWallet ? (
                        <button
                          onClick={() => {
                            connectedWallet.disconnect();
                            setMenuOpen(false);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-2 text-sm"
                        >
                          <MdWallet className="text-lg" />
                          <span>Disconnect Wallet</span>
                        </button>
                      ) : (
                        <button
                          onClick={handleConnectWallet}
                          className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-2 text-sm"
                        >
                          <MdWallet className="text-lg" />
                          <span>Connect Wallet</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          handleLogout();
                          setMenuOpen(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-2 text-sm border-t border-white/10"
                      >
                        <MdLogout className="text-lg" />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Wallet Connection Section - Shows all connected wallets */}
                
              </>
          ) : (
              <button 
                onClick={handleTwitterLogin} 
                className="px-4 py-2 gradient-button transition-colors rounded-md font-bold h-10"
              >
                Log in
              </button>
          )}
      </div>
  );
}