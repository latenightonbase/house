import { ethers } from "ethers";
import { readContractSetup } from "./contractSetup";
import { erc20Abi } from "./contracts/abis/erc20Abi";
import dbConnect from "./db";
import PlatformMeta from "./schemas/PlatformMeta";

export async function checkTokenAmount(wallet:string){
    try{
        const contract = await readContractSetup("0x05AF98aeBeC91AeF2BD893614a2C333C58855012", erc20Abi);

        if(!contract){
            throw new Error('Failed to set up contract');
        }

        const balance = await contract.balanceOf(wallet);
        const formattedBalance = ethers.formatEther(balance);

        await dbConnect();

        const platformMeta = await PlatformMeta.findOne();
        const minTokenRequired = platformMeta?.minTokenRequired ?? 0;

        return {allow: Number(formattedBalance) >= minTokenRequired, short: minTokenRequired - Number(formattedBalance)};
        
    }
    catch(err){
        console.error('Error checking token amount:', err);
        throw err;
    }
}