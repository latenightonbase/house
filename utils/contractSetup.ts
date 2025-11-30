import {ethers} from 'ethers';
import toast from 'react-hot-toast';

export async function writeNewContractSetup(contractAddress:string, abi:any, wallet:any) {
    // @ts-ignore
    // if (window && typeof window?.ethereum !== "undefined") {
      try {
        // @ts-ignore
        const provider = await wallet.getEthereumProvider();

        if(!provider) {
          toast.error("No provider found from wallet");
          throw new Error("No provider found from wallet");
        }

        toast.success("Provider obtained from wallet");

        const ethersProvider = new ethers.BrowserProvider(provider);

        if(!ethersProvider) {
          toast.error("Failed to create ethers provider from wallet provider");
          throw new Error("Failed to create ethers provider from wallet provider");
        }

        toast.success("Ethers provider created from wallet provider");

        const signer = await ethersProvider.getSigner();

        if(!signer) {
          toast.error("Failed to get signer from ethers provider");
          throw new Error("Failed to get signer from ethers provider");
        }

        toast.success("Signer obtained from ethers provider");

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