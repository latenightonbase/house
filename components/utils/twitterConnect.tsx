import { useLogin, usePrivy, useWallets } from '@privy-io/react-auth';
import Image from 'next/image';
import { MdWallet, MdLogout, MdClose } from 'react-icons/md';
import { useState } from 'react';

export default function LoginWithOAuth() {
  const { user, authenticated, connectWallet, linkWallet, logout, unlinkWallet, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const [showDisconnectMenu, setShowDisconnectMenu] = useState(false);
  
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
    login({disableSignup:true, loginMethods: ['twitter']});
  };

  const handleConnectWallet = async () => {
    try {
      // If user is authenticated, link wallet; otherwise connect wallet
      if (authenticated) {
        await linkWallet();
      } else {
        await connectWallet();
      }
    } catch (err) {
      console.error('Wallet connection failed', err);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setShowDisconnectMenu(false);
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  const handleUnlinkWallet = async () => {
    try {
      const connectedWallet = wallets.length > 0 ? wallets[0] : (user?.wallet ? { address: user.wallet.address } : null);
      if (connectedWallet) {
        await unlinkWallet(connectedWallet.address);
      }
    } catch (err) {
      console.error('Unlink wallet failed', err);
    }
  };

  // Check if user is authenticated and has Twitter profile
  const twitterAccount = user?.twitter;
  const connectedWallet = wallets.length > 0 ? wallets[0] : (user?.wallet ? { address: user.wallet.address } : null);
  const hasWallet = !!connectedWallet;

  return (
      <div className="flex flex-col gap-3 relative">
          {authenticated && twitterAccount ? (
              <>
                <div className="flex items-center justify-between gap-2 bg-white/10 px-3 py-2 rounded-full">
                    <div className="flex items-center gap-2">
                      {twitterAccount.profilePictureUrl && (
                          <Image
                          unoptimized
                              src={twitterAccount.profilePictureUrl}
                              alt={twitterAccount.username || 'Twitter Profile'}
                              width={32}
                              height={32}
                              className="rounded-full w-11 aspect-square bg-primary/50 border-2 border-primary"
                          />
                      )}
                      <span className="text-sm font-medium">
                          @{twitterAccount.username}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowDisconnectMenu(!showDisconnectMenu)}
                      className="p-1 hover:bg-white/10 rounded-full transition-colors"
                      title="Disconnect"
                    >
                      <MdLogout className="text-lg" />
                    </button>
                </div>

                {/* Disconnect Menu */}
                {showDisconnectMenu && (
                  <div className="absolute top-full mt-1 right-0 bg-gray-900 border border-gray-700 rounded-lg shadow-lg p-2 z-10 min-w-[200px]">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 hover:bg-red-500/10 text-red-400 rounded transition-colors flex items-center gap-2"
                    >
                      <MdLogout />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
                
                {/* Wallet Connection Section */}
                {hasWallet && connectedWallet ? (
                  <div className="flex items-center justify-between gap-2 bg-green-500/10 px-3 py-2 rounded-full border border-green-500/20">
                    <div className="flex items-center gap-2">
                      <MdWallet className="text-green-500 text-xl" />
                      <span className="text-sm font-medium text-green-500">
                        {connectedWallet.address.slice(0, 6)}...{connectedWallet.address.slice(-4)}
                      </span>
                    </div>
                    <button
                      onClick={handleUnlinkWallet}
                      className="p-1 hover:bg-red-500/10 rounded-full transition-colors"
                      title="Disconnect Wallet"
                    >
                      <MdClose className="text-lg text-red-400" />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={handleConnectWallet} 
                    className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/80 px-4 py-2 rounded-full transition-colors"
                  >
                    <MdWallet className="text-xl" />
                    <span className="text-sm font-medium">
                      Connect Wallet
                    </span>
                  </button>
                )}
              </>
          ) : (
              <button 
                onClick={handleTwitterLogin} 
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-full transition-colors"
              >
                Log in with Twitter
              </button>
          )}
      </div>
  );
}