import {ethers} from 'ethers';
import toast from 'react-hot-toast';

export async function writeContractSetup(contractAddress:string, abi:any) {
    // @ts-ignore
    if (window && typeof window?.ethereum !== "undefined") {
      try {
        // @ts-ignore
        await window.ethereum.request({ method: "eth_requestAccounts" });
        // @ts-ignore
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const auctionContract = new ethers.Contract(
          contractAddress,
          abi,
          signer
        );

        return auctionContract;
      } catch (error) {
        console.error("Error setting up contract:", error);
      }
    } else {
      toast.error("Wallet not detected. ");
      console.error("MetaMask is not installed");
    }
}

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