import { base, createBaseAccountSDK } from "@base-org/account";
import toast from "react-hot-toast";

export const checkStatus = async (callsId: string) => {

    const provider = createBaseAccountSDK({
        appName: "Bill test app",
        appLogoUrl: "https://www.houseproto.fun/pfp.jpg",
        appChainIds: [base.constants.CHAIN_IDS.base],
    }).getProvider();

  const status:any = await provider.request({
    method: 'wallet_getCallsStatus',
    params: [callsId]
  });

  toast.loading(`Checking transaction status ${status.status} `, { id: callsId });
  
  if (status.status === 200) {
    console.log('Batch completed successfully!');
    console.log('Transaction receipts:', status.receipts);
    toast.success('Transaction completed successfully!', { id: callsId });
    return true;
  } else if (status.status === 100) {
    console.log('Batch still pending...');
    setTimeout(() => checkStatus(callsId), 2000); // Check again in 2 seconds
  } else {
    console.error('Batch failed with status:', status.status);
    return false;
  }
};