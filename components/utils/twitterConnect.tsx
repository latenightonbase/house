import { useLogin, usePrivy, useWallets, useConnectWallet } from '@privy-io/react-auth';
import Image from 'next/image';
import { MdWallet, MdLogout, MdMoreVert } from 'react-icons/md';
import { useState } from 'react';

export default function LoginWithOAuth() {
  const { user, authenticated, logout, getAccessToken } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { connectWallet } = useConnectWallet();
  const [menuOpen, setMenuOpen] = useState(false);

  
  const { login } = useLogin({
    onComplete: async ({ user, isNewUser, wasAlreadyAuthenticated, loginMethod, loginAccount }) => {
      console.log('User logged in successfully', user);
      if (isNewUser) {
        console.log('New user created');
      }
      
      // Save Twitter profile to database if Twitter was linked
      if (user?.twitter && user?.wallet) {
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
  
  // Get connected external wallets (not embedded wallets)
  const externalWallets = wallets.filter(
    wallet => wallet.walletClientType !== 'privy'
  );

  return (
      <div className="flex flex-col gap-3 relative">
          {authenticated && twitterAccount ? (
              <>
                {/* Twitter Account Display */}
                <div className="relative">
                  <div 
                    className="flex items-center justify-between gap-2 bg-white/10 px-3 py-2 max-lg:p-1 rounded-full cursor-pointer hover:bg-white/20 transition-colors"
                    onClick={() => setMenuOpen(!menuOpen)}
                  >
                      <div className="flex items-center gap-2">
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
                        <div className="max-lg:hidden">
                          <span className="text-sm font-medium">
                            @{twitterAccount.username}
                        </span>
                          {externalWallets.map((wallet) => (
                      <div 
                        key={wallet.address}
                        className="flex items-center justify-between gap-2  rounded-full"
                      >
                        <div className="flex items-center gap-2">
                        
                          <span className="text-sm font-medium text-green-500">
                            {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                          </span>
                        </div>
                      </div>
                    ))}
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
                        {externalWallets.map((wallet) => (
                          <div key={wallet.address} className="text-sm text-green-500">
                            {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                          </div>
                        ))}
                      </div>
                      
                      {externalWallets.length > 0 ? (
                        externalWallets.map((wallet) => (
                          <button
                            key={wallet.address}
                            onClick={() => {
                              wallet.disconnect();
                              setMenuOpen(false);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-2 text-sm"
                          >
                            <MdWallet className="text-lg" />
                            <span>Disconnect Wallet</span>
                          </button>
                        ))
                      ) : (
                        <button
                          onClick={() => {
                            connectWallet();
                            setMenuOpen(false);
                          }}
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