# XP System - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Initialize Season 1

Run the initialization script:

```bash
cd scripts
npx tsx init-season.ts
```

**Expected Output:**
```
🔌 Connecting to MongoDB...
✅ Connected to MongoDB

📅 Creating Season 1...
   Start Date: 2026-02-01T00:00:00.000Z
   End Date: 2026-02-28T23:59:59.999Z
✅ Season 1 created successfully!

🔄 Scheduling season rollover job...
✅ Season rollover scheduled:
   Next Rollover: 2026-03-01T00:00:00.000Z
   Pattern: Monthly on 1st at midnight

🎉 Season initialization complete!
```

### Step 2: Start the Worker

```bash
cd apps/worker
npm run dev
```

This enables automatic season rollover on the 1st of each month.

### Step 3: Test XP Earning

1. **Create an Auction**
   - Go to `/create`
   - Fill in auction details
   - Submit
   - ✅ Earns: **10 XP**

2. **Bid on an Auction**
   - Browse auctions
   - Place a bid on someone else's auction
   - ✅ Earns: **5 XP + (bid USD × 0.1)**
   - Example: $50 bid = 5 + 5 = **10 XP**

3. **Win an Auction**
   - Wait for auction to end
   - ✅ Earns: **100 XP + (winning bid USD × 0.2)**
   - Example: $50 win = 100 + 10 = **110 XP**

4. **Leave a Review**
   - After winning, submit a review
   - ✅ Earns: **25 XP**

### Step 4: View Leaderboard

Navigate to `/leaderboard` and see 4 tabs:
- **Season XP** - Current month rankings
- **All-Time XP** - Total XP across all seasons
- **Top Revenue** - Host earnings
- **Highest Bids** - Biggest single bids

## 🔍 Verify Installation

### Check Season Status
```bash
curl http://localhost:3000/api/admin/init-season
```

### Check User XP (Authenticated)
```bash
curl http://localhost:3000/api/leaderboard/user-stats \
  -H "Authorization: Bearer YOUR_PRIVY_TOKEN"
```

### Check Current Leaderboard
```bash
curl http://localhost:3000/api/leaderboard/season?type=season&limit=10
```

## 📊 XP Earning Reference

| Action | Base XP | USD Bonus | Example |
|--------|---------|-----------|---------|
| Create Auction | 10 | - | 10 XP |
| Bid ($10) | 5 | +1 | 6 XP |
| Bid ($100) | 5 | +10 | 15 XP |
| Win ($50) | 100 | +10 | 110 XP |
| Win ($500) | 100 | +100 | 200 XP |
| Leave Review | 25 | - | 25 XP |

**Important Rules:**
- ❌ No XP for bidding on your own auctions
- ✅ Multiple bids on same auction each earn XP
- ✅ XP awards are non-blocking (won't break actions if they fail)

## 🎮 Level System

Levels are calculated using: **level² × 100 XP**

| Level | XP Required | Total XP Needed |
|-------|-------------|-----------------|
| 1 | 100 | 0-100 |
| 2 | 300 | 100-400 |
| 3 | 500 | 400-900 |
| 5 | 900 | 1600-2500 |
| 10 | 1900 | 9000-10000 |
| 20 | 3900 | 39000-40000 |

## 📅 Season Schedule

- **Season 1**: February 1-28, 2026
- **Season 2**: March 1-31, 2026 (auto-created)
- **Season 3**: April 1-30, 2026 (auto-created)
- And so on...

**Rollover happens automatically at midnight UTC on the 1st of each month.**

## 🐛 Troubleshooting

### XP Not Being Awarded?

1. **Check season is active:**
   ```bash
   curl http://localhost:3000/api/admin/init-season
   ```
   Should show `"active": true`

2. **Check console logs:**
   Look for:
   - `✅ Awarded X XP for [action]`
   - `⚠️ Failed to award XP:` (indicates issue)

3. **Verify MongoDB connection:**
   Check that `MONGO_URI` is set in `.env.local`

### Leaderboard Empty?

1. **Initialize Season 1** if not done
2. **Earn some XP** by creating/bidding on auctions
3. **Refresh the page**

### Worker Not Starting?

1. **Check Redis connection:**
   Verify `REDIS_URL` in `.env.local`

2. **Check dependencies:**
   ```bash
   cd apps/worker
   npm install
   ```

3. **View logs:**
   ```bash
   npm run dev
   ```
   Should show: `✅ Workers started and listening for jobs`

## 🎯 Next Steps

Once XP system is working:

1. **Monitor XP awards** in production
2. **Adjust XP values** if needed (in `xpService.ts`)
3. **Add UI indicators** for level-ups
4. **Consider rewards** for top season performers
5. **Add achievements** system
6. **Implement XP multipliers** for special events

## 📚 Full Documentation

For complete details, see:
- **XP_SYSTEM_README.md** - Full technical documentation
- **IMPLEMENTATION_SUMMARY.md** - What was built

## ✅ Success Checklist

- [ ] Season 1 initialized
- [ ] Worker running
- [ ] Created auction and earned 10 XP
- [ ] Placed bid and earned XP
- [ ] Viewed leaderboard with data
- [ ] Checked user stats API
- [ ] Verified level calculation

---

**Need Help?** Check the console logs or MongoDB directly to debug XP awards.

**Ready to go live?** All systems are operational! 🎉
