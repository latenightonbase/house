import { ConnectButton } from '@rainbow-me/rainbowkit';
import { MdWallet } from 'react-icons/md';
export const WalletConnect = () => {
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
                    className="bg-bill-pink text-center px-4 py-2 rounded text-lg font-bold text-white hover:bg-orange-600"
                  >
                    CONNECT
                  </button>
                );
              }
              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="bg-bill-pink text-center px-4 py-2 rounded text-lg font-bold text-white hover:bg-orange-800"
                  >
                    Wrong network
                  </button>
                );
              }
              return (
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={openAccountModal}
                    type="button"
                    className="bg-bill-pink flex items-center gap-2 text-center px-4 py-2 rounded text-md font-bold text-white hover:bg-pink-700"
                  >
                    <MdWallet/>
                    {account.displayName.toUpperCase()}
                    
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