import { useGlobalContext } from '@/utils/providers/globalContext';
import { usePrivy } from '@privy-io/react-auth';
import Image from 'next/image';
import { MdWallet } from 'react-icons/md';
import { CiLogin } from "react-icons/ci";
import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect } from 'react';

export const WalletConnect = () => {
  const { user } = useGlobalContext();
  const { authenticated, user: privyUser, login, logout } = usePrivy();
  const { data: session } = useSession();

  // Sync Privy authentication with NextAuth
  useEffect(() => {
    if (authenticated && privyUser?.farcaster && !session) {
      // Sign in to NextAuth when Privy is authenticated
      console.log("Signing in to NextAuth with Farcaster data from Privy:", privyUser.farcaster);
      signIn('credentials', {
        fid: privyUser.farcaster.fid.toString(),
        username: privyUser.farcaster.username,
        pfpUrl: privyUser.farcaster.pfp,
        bio: privyUser.farcaster.bio,
        verifications: JSON.stringify(privyUser.farcaster.verifications),
        redirect: false,
      });
    } else if (!authenticated && session) {
      // Sign out of NextAuth when Privy is not authenticated
      signOut({ redirect: false });
    }
  }, [authenticated, privyUser, session]);

  const handleLogin = () => {
    login();
  };

  const handleLogout = () => {
    logout();
    signOut({ redirect: false });
  };

  if (!authenticated) {
    return (
      <button
        onClick={handleLogin}
        type="button"
        className="text-center w-full flex gap-1 px-2 max-lg:py-1 py-3 gradient-button items-center justify-center rounded text-md font-bold text-white"
      >
        Login<CiLogin className='text-xl'/>
      </button>
    );
  }

  // If user exists and has complete profile info, show profile
  if (privyUser?.farcaster) {
    return (
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={handleLogout}
          type="button"
          className="flex bg-primary/10 lg:p-2 items-center gap-2 text-center w-full rounded-lg text-md font-bold text-white"
        >
          <div className='flex items-center gap-2'>
            <Image unoptimized
              alt="Profile Picture"
              src={privyUser.farcaster?.pfp as string}
              width={40}
              height={40}
              className="lg:w-8 lg:h-8 h-6 w-6 aspect-square border border-primary rounded-md"
            />
            <div className='flex flex-col text-left max-lg:hidden'>
              <span className='text-sm font-medium'>{privyUser.farcaster?.username}</span>
            </div>
          </div>
        </button>
      </div>
    );
  }

  // Fallback for when user exists but profile is incomplete
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <button
        onClick={handleLogout}
        type="button"
        className="flex bg-primary/10 lg:p-2 items-center gap-2 text-center w-full rounded-lg text-md font-bold text-white"
      >
        <div className='flex items-center gap-2'>
          <div className="lg:w-8 lg:h-8 h-6 w-6 aspect-square border border-primary rounded-md bg-gray-600 flex items-center justify-center">
            <MdWallet className='text-sm' />
          </div>
          <div className='flex flex-col text-left max-lg:hidden'>
            <span className='text-sm font-medium'>{privyUser?.farcaster?.username || 'Farcaster User'}</span>
          </div>
        </div>
      </button>
    </div>
  );
};