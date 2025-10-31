import { useGlobalContext } from '@/utils/providers/globalContext';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Image from 'next/image';
import { MdWallet } from 'react-icons/md';
import { CiLogin } from "react-icons/ci";
import { signOut } from "next-auth/react";

export const WalletConnect = () => {

  const {user} = useGlobalContext();

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        // Note: If your app doesn't use authentication, you
        // can remove all 'authenticationStatus' checks
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus ||
            authenticationStatus === 'authenticated');

        const handleDisconnect = () => {
          signOut(); // Clear the session
        };

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              'style': {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className=" text-center w-full flex gap-1 px-2 max-lg:py-1 py-3 gradient-button items-center justify-center rounded text-md font-bold text-white "
                  >
                    Login<CiLogin className='text-xl'/>
                  </button>
                );
              }
              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="bg-red-500 text-center w-full rounded text-lg font-bold text-white hover:bg-red-400"
                  >
                    Wrong network
                  </button>
                );
              }

              // If user exists and has complete profile info, show profile
              if(user && user?.pfp_url !== "" && user?.username !== "") {
                return (
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      onClick={openAccountModal}
                      type="button"
                      className=" flex bg-primary/10 lg:p-2 items-center gap-2 text-center w-full rounded-lg text-md font-bold text-white"
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
                  </div>
                );
              }

              // Fallback for when user exists but profile is incomplete
              return (
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={openAccountModal}
                    type="button"
                    className=" flex bg-primary/10 lg:p-2 items-center gap-2 text-center w-full rounded-lg text-md font-bold text-white"
                  >
                    <div className='flex items-center gap-2'>
                      <div className="lg:w-8 lg:h-8 h-6 w-6 aspect-square border border-primary rounded-md bg-gray-600 flex items-center justify-center">
                        <MdWallet className='text-sm' />
                      </div>
                      <div className='flex flex-col text-left max-lg:hidden'>
                        <span className='text-sm font-medium'>{account.displayName}</span>
                      </div>
                    </div>
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
};