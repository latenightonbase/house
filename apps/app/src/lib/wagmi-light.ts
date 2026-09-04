import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { base, baseSepolia } from "wagmi/chains";
import { robinhood } from "@/lib/chains";

/**
 * First-paint wagmi config: injected wallets only. WalletConnect / MetaMask SDK
 * stay out of the homepage bundle so phones can render before those clients start.
 */
export const lightConfig = createConfig({
  chains: [robinhood, base, baseSepolia],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [robinhood.id]: http(),
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  ssr: true,
  multiInjectedProviderDiscovery: false,
});
