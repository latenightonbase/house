import {
  auctionHouseAbi,
  auctionHouseAddress,
  feeRecipient,
  operatorAccount,
  publicClient,
  walletClient,
} from "../lib/operator";

const recipient = feeRecipient();
const account = operatorAccount();
const wallet = walletClient();
const client = publicClient();
const house = auctionHouseAddress();

if (!recipient) {
  throw new Error("FEE_RECIPIENT is unset or invalid");
}
if (!account || !wallet) {
  throw new Error("OPERATOR_PRIVATE_KEY is unset or invalid");
}

const current = await client.readContract({
  address: house,
  abi: auctionHouseAbi,
  functionName: "feeReceiver",
});

console.log(`AuctionHouse ${house}`);
console.log(`feeReceiver  ${current}`);
console.log(`FEE_RECIPIENT ${recipient}`);

if (current.toLowerCase() === recipient.toLowerCase()) {
  console.log("Already set — nothing to do");
  process.exit(0);
}

const hash = await wallet.writeContract({
  address: house,
  abi: auctionHouseAbi,
  functionName: "setFeeReceiver",
  args: [recipient],
  account,
});
const receipt = await client.waitForTransactionReceipt({ hash });
if (receipt.status === "reverted") {
  throw new Error("setFeeReceiver reverted");
}

const next = await client.readContract({
  address: house,
  abi: auctionHouseAbi,
  functionName: "feeReceiver",
});
console.log(`updated feeReceiver=${next} tx=${hash}`);
