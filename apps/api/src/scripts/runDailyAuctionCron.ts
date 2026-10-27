import { settleAndRolloverDailyAuction } from "../lib/dailyAuction";

const result = await settleAndRolloverDailyAuction();
console.log(JSON.stringify(result, null, 2));
if ("ok" in result && result.ok === false) process.exit(1);
