import { useLogin, usePrivy, useWallets, useConnectWallet } from '@privy-io/react-auth';
import Image from 'next/image';
import { MdWallet, MdLogout, MdMoreVert, MdLogin } from 'react-icons/md';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface XPStats {
  level: number;
  currentSeasonXP: number;
  totalXP: number;
}

interface LoginWithOAuthProps {
  xpStats?: XPStats | null;
}

export default function LoginWithOAuth({ xpStats }: LoginWithOAuthProps) {
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

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
      
      // Check if iframe_redirect query parameter is present and redirect AFTER user creation
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('type') === 'iframe_redirect') {
        window.location.href = 'https://wl.houseproto.fun/whitelist/house-protocol/portal';
        return;
      }
    },
    onError: (error) => {
      console.error('Login failed', error);
    }
  });

  // Check if user is authenticated and has Twitter profile
  const twitterAccount = user?.twitter;
  
  // Get connected external wallets (not embedded wallets) - only use the first one
  const externalWallets = wallets.filter(
    wallet => wallet.walletClientType !== 'privy'
  );
  const connectedWallet = externalWallets.length > 0 ? externalWallets[0] : null;

  // Close dialog when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        setDialogOpen(false);
      }
    };

    if (dialogOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dialogOpen]);

  // Auto-connect wallet when logged in but wallet not connected (PC only)
  useEffect(() => {
    if (authenticated && twitterAccount && !connectedWallet && walletsReady) {
      const isDesktop = window.innerWidth >= 1024;
      if (isDesktop) {
        handleConnectWallet();
      }
    }
  }, [authenticated, twitterAccount, connectedWallet, walletsReady]);


    // Auto-trigger login if iframe_redirect query parameter is present
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('type') === 'iframe_redirect' && !authenticated) {
      login({ loginMethods: ['twitter']});
    }
  }, [authenticated, login]);

  const handleTwitterLogin = () => {
    // Check if running in an iframe
    if (window.self !== window.top) {
      // Redirect to the main site with iframe_redirect parameter
      window.top!.location.href = 'https://houseproto.fun?type=iframe_redirect';
      return;
    }
    
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

  return (
      <div className="flex flex-col gap-3 relative">
          {authenticated && twitterAccount ? (
              <>
                {/* Mobile View - Twitter Account Display */}
                <div className="relative lg:hidden" ref={menuRef}>
                  <div 
                    className="flex items-center justify-between gap-2 bg-white/10 px-3 py-2 max-lg:p-1 rounded-lg cursor-pointer hover:bg-white/20 transition-colors"
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
                                className="rounded-lg w-8 aspect-square bg-primary/50 border-2 border-primary"
                            />
                        )}
                        {!connectedWallet && (
                          <div className="flex items-center gap-2 bg-red-500/80 text-nowrap text-xs px-2 py-1 absolute -left-12 top-full mt-2 animate-bounce rounded-full">
                            <MdWallet className="text-sm" />
                            Not Connected
                          </div>
                        )}
                      </div>
                  </div>

                  {/* Dropdown Menu - Mobile */}
                  <AnimatePresence>
                    {menuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute right-0 bottom-[110%] mt-2 bg-black/90 border border-primary/20 backdrop-blur-md rounded-lg shadow-lg overflow-hidden z-50 min-w-[200px]"
                      >
                        {/* User Info */}
                        <div className="px-4 py-3 border-b border-white/10">
                          <div className="text-sm font-medium mb-1">
                            @{twitterAccount.username}
                          </div>
                          {connectedWallet && (
                            <div className="text-xs text-primary mb-2">
                              {connectedWallet.address.slice(0, 6)}...{connectedWallet.address.slice(-4)}
                            </div>
                          )}
                          {xpStats && (
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
                              <div className="bg-purple-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                                {xpStats.level}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs text-gray-400">Level {xpStats.level}</span>
                                <span className="text-xs font-semibold text-primary">{xpStats.currentSeasonXP} XP</span>
                              </div>
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
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Desktop View - Profile Picture Square */}
                <div className="hidden lg:flex items-center relative ">
                  <button
                    onClick={() => setDialogOpen(!dialogOpen)}
                    className="w-[48px] h-[48px] selected-gradient rounded-xl cursor-pointer hover:opacity-80 transition-opacity relative"
                  >
                    {twitterAccount.profilePictureUrl && (
                      <Image
                        unoptimized
                        src={twitterAccount.profilePictureUrl}
                        alt={twitterAccount.username || 'Twitter Profile'}
                        width={48}
                        height={48}
                        className="rounded-xl w-full h-full object-cover"
                      />
                    )}
                  </button>

                  {/* Dropdown Menu - Desktop */}
                  <AnimatePresence>
                    {dialogOpen && (
                      <motion.div
                        ref={dialogRef}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute left-0 bottom-[110%] mt-2 bg-[#1a1a1a] border border-primary/20 rounded-xl shadow-2xl overflow-hidden w-[220px] z-50"
                      >
                        {/* User Info Header */}
                        <div className="px-4 py-4 border-b border-white/10 bg-gradient-to-br from-primary/5 to-secondary/5">
                          <div className="flex items-center gap-3 mb-3">
                            {twitterAccount.profilePictureUrl && (
                              <div className="relative">
                                <Image
                                  unoptimized
                                  src={twitterAccount.profilePictureUrl}
                                  alt={twitterAccount.username || 'Twitter Profile'}
                                  width={40}
                                  height={40}
                                  className="rounded-full border-2 border-primary/50"
                                />
                                {xpStats && (
                                  <div className="absolute -bottom-1 -right-1 bg-purple-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border border-black">
                                    {xpStats.level}
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold truncate">
                                {twitterAccount.username}
                              </div>
                              {connectedWallet && (
                                <div className="text-xs text-caption truncate">
                                  {connectedWallet.address.slice(0, 6)}...{connectedWallet.address.slice(-4)}
                                </div>
                              )}
                            </div>
                          </div>
                          {xpStats && (
                            <div className="flex items-center justify-between bg-black/30 rounded-lg px-3 py-2">
                              <div className="flex flex-col">
                                <span className="text-xs text-gray-400">Season XP</span>
                                <span className="text-sm font-bold text-primary">{xpStats.currentSeasonXP}</span>
                              </div>
                              <div className="flex flex-col text-right">
                                <span className="text-xs text-gray-400">Level</span>
                                <span className="text-sm font-bold text-purple-400">{xpStats.level}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Menu Options */}
                        <div className="py-1">
                          <button
                            onClick={() => {
                              window.location.href = '/profile';
                              setDialogOpen(false);
                            }}
                            className="w-full px-4 py-2.5 text-left hover:bg-white/5 transition-colors flex items-center gap-3 text-sm"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span>Profile</span>
                          </button>
                          <button
                            onClick={() => {
                              window.location.href = '/my-auctions';
                              setDialogOpen(false);
                            }}
                            className="w-full px-4 py-2.5 text-left hover:bg-white/5 transition-colors flex items-center gap-3 text-sm"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>My Auctions</span>
                          </button>
                          <button
                            onClick={() => {
                              window.location.href = '/won-bids';
                              setDialogOpen(false);
                            }}
                            className="w-full px-4 py-2.5 text-left hover:bg-white/5 transition-colors flex items-center gap-3 text-sm"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                            <span>Won Bids</span>
                          </button>
                        </div>

                        {/* Disconnect Section */}
                        <div className="border-t border-white/10">
                          {connectedWallet ? (
                            <button
                              onClick={() => {
                                connectedWallet.disconnect();
                                setDialogOpen(false);
                              }}
                              className="w-full px-4 py-2.5 text-left hover:bg-white/5 transition-colors flex items-center gap-3 text-sm text-red-400"
                            >
                              <MdWallet className="text-base" />
                              <span>Disconnect</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                handleConnectWallet();
                                setDialogOpen(false);
                              }}
                              className="w-full px-4 py-2.5 text-left hover:bg-white/5 transition-colors flex items-center gap-3 text-sm"
                            >
                              <MdWallet className="text-base" />
                              <span>Connect Wallet</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              handleLogout();
                              setDialogOpen(false);
                            }}
                            className="w-full px-4 py-2.5 text-left hover:bg-white/5 transition-colors flex items-center gap-3 text-sm border-t border-white/10 text-red-400"
                          >
                            <MdLogout className="text-base" />
                            <span>Logout</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
          ) : (
              <>
                {/* Mobile Login */}
                <button 
                  onClick={handleTwitterLogin} 
                  className="lg:hidden p-2 gradient-button transition-colors rounded-md font-bold h-10"
                >
                  <MdLogin className="text-lg" />
                </button>

                {/* Desktop Login */}
                <button
                  onClick={handleTwitterLogin}
                  className="hidden lg:flex w-[48px] h-[48px] selected-gradient rounded-lg items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <MdLogin className="text-2xl" />
                </button>
              </>
          )}
      </div>
  );
}