import { base, createBaseAccountSDK } from "@base-org/account";
import toast from "react-hot-toast";

export const checkStatus = async (callsId: string, attempt: number = 1) => {

    const provider = createBaseAccountSDK({
        appName: "Bill test app",
        appLogoUrl: "https://www.houseproto.fun/pfp.jpg",
        appChainIds: [base.constants.CHAIN_IDS.base],
    }).getProvider();

  const status:any = await provider.request({
    method: 'wallet_getCallsStatus',
    params: [callsId]
  });
  
  if (status.status === "CONFIRMED") {
    console.log('Batch completed successfully!');
    console.log('Transaction receipts:', status.receipts);
    toast.success('Transaction completed successfully!', { id: callsId });
    return true;
  } else if (status.status !== "CONFIRMED") {
    if (attempt < 5) {
      console.log(`Batch still pending... (Attempt ${attempt}/5)`);
      setTimeout(() => checkStatus(callsId, attempt + 1), 2000); // Check again in 2 seconds
    } else {
      console.error('Batch failed: Maximum retry attempts (5) reached');
      toast.error('Transaction check failed: Maximum attempts reached', { id: callsId });
      return false;
    }
  } else {
    console.error('Batch failed with status:', status.status);
    toast.error('Transaction failed', { id: callsId });
    return false;
  }
};