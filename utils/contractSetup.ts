import {ethers} from 'ethers';
import toast from 'react-hot-toast';
import {base} from 'viem/chains';

export async function writeNewContractSetup(contractAddress:string, abi:any, wallet:any) {
    // @ts-ignore
    // if (window && typeof window?.ethereum !== "undefined") {
      try {
        await wallet.switchChain({ chainId: base.id }); // Base Mainnet chain ID
        const provider = await wallet.getEthereumProvider();

        const ethersProvider = new ethers.BrowserProvider(provider);

        const signer = await ethersProvider.getSigner();

        const auctionContract = new ethers.Contract(
          contractAddress,
          abi,
          signer
        );

        return auctionContract;
      } catch (error) {
        console.error("Error setting up contract:", error);
      }
    // } else {
    //   console.error("MetaMask is not installed");
    // }
}

// export async function writeContractSetup(contractAddress:string, abi:any) {
//     // @ts-ignore
//     if (window && typeof window?.ethereum !== "undefined") {
//       try {
//         // @ts-ignore
//         await window.ethereum.request({ method: "eth_requestAccounts" });
//         // @ts-ignore
//         const provider = new ethers.BrowserProvider(window.ethereum);
//         const signer = await provider.getSigner();
//         const auctionContract = new ethers.Contract(
//           contractAddress,
//           abi,
//           signer
//         );

//         return auctionContract;
//       } catch (error) {
//         console.error("Error setting up contract:", error);
//       }
//     } else {
//       console.error("MetaMask is not installed");
//     }
// }

export async function readContractSetup(contractAddress:string, abi:any) {
    try {
        // @ts-ignore
        const provider = new ethers.JsonRpcProvider(
        "https://base-mainnet.g.alchemy.com/v2/CA4eh0FjTxMenSW3QxTpJ7D-vWMSHVjq"
      );

      const contract = new ethers.Contract(contractAddress, abi, provider);
      return contract;
      } catch (error) {
        console.error("Error setting up contract:", error);
      }
}