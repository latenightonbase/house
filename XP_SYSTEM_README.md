# XP and Seasonal Leaderboard System

## Overview

The XP (Experience Points) and Seasonal Leaderboard system rewards users for participating in auctions. Users earn XP for various activities, level up based on their total XP, and compete in monthly seasons.

## Features

### 🎯 XP Earning Activities

Users earn XP for the following actions:

1. **Creating Auctions**: `10 XP` per auction created
2. **Bidding**: `5 XP base + (bid amount in USD × 0.1)` per bid
   - Multiple bids on the same auction earn XP each time
   - **No XP for bidding on your own auctions**
3. **Winning Auctions**: `100 XP base + (winning amount in USD × 0.2)`
4. **Leaving Reviews**: `25 XP` per review submitted

### 📊 Level System

- **Formula**: Exponential leveling (Level² × 100 XP required)
- **Examples**:
  - Level 1: 0-100 XP
  - Level 2: 100-400 XP
  - Level 3: 400-900 XP
  - Level 4: 900-1600 XP
  - Level 10: 9000-10000 XP

### 🏆 Seasonal System

- **Duration**: 1 month per season
- **Season 1**: February 1-28, 2026
- **Reset**: On the 1st of each month at midnight (UTC)
- **Tracking**: 
  - `currentSeasonXP`: Resets to 0 each season
  - `totalXP`: Cumulative across all seasons (never resets)
  - `level`: Based on total XP

## Database Schema

### User Schema Updates
```typescript
{
  totalXP: number;           // All-time XP (never resets)
  currentSeasonXP: number;   // Current season XP (resets monthly)
  level: number;             // Calculated from totalXP
  lastXPUpdate: Date;        // Timestamp of last XP award
  xpHistory: [{              // Audit log of all XP awards
    amount: number;
    action: string;
    timestamp: Date;
    metadata: object;
  }]
}
```

### Season Schema
```typescript
{
  seasonNumber: number;      // 1, 2, 3, etc.
  startDate: Date;          // Season start (1st of month, 00:00)
  endDate: Date;            // Season end (last day of month, 23:59)
  active: boolean;          // Only one active season at a time
  totalXPAwarded: number;   // Sum of all XP awarded this season
  totalParticipants: number; // Users with XP > 0 this season
}
```

### SeasonLeaderboard Schema
```typescript
{
  user: ObjectId;           // Reference to User
  season: ObjectId;         // Reference to Season
  seasonNumber: number;     // Denormalized for faster queries
  totalXP: number;          // XP earned during that season
  level: number;            // User's level at season end
  rank: number;             // Final rank in that season
}
```

## API Endpoints

### Leaderboards

#### Get Season Leaderboard
```http
GET /api/leaderboard/season?type=season&limit=100&offset=0
GET /api/leaderboard/season?type=season&seasonNumber=1
GET /api/leaderboard/season?type=alltime&limit=100
```

**Response**:
```json
{
  "success": true,
  "type": "season",
  "season": {
    "seasonNumber": 1,
    "active": true,
    "startDate": "2026-02-01T00:00:00.000Z",
    "endDate": "2026-02-28T23:59:59.999Z"
  },
  "leaderboard": [
    {
      "userId": "...",
      "username": "alice",
      "currentSeasonXP": 1250,
      "totalXP": 5430,
      "level": 7,
      "rank": 1
    }
  ]
}
```

#### Get User XP Stats
```http
GET /api/leaderboard/user-stats
Authorization: Bearer <privy-token>
```

**Response**:
```json
{
  "success": true,
  "stats": {
    "userId": "...",
    "totalXP": 5430,
    "currentSeasonXP": 1250,
    "level": 7,
    "xpToNextLevel": 1470,
    "seasonRank": 5,
    "allTimeRank": 12
  }
}
```

### Admin Endpoints

#### Initialize Season 1
```http
POST /api/admin/init-season
X-Admin-Secret: <your-admin-secret>
```

#### Get All Seasons
```http
GET /api/admin/init-season
```

## XP Service Functions

Located in `apps/web/utils/xpService.ts`:

### Core Functions

```typescript
// Award XP to a user
await awardXP({
  userId: string | ObjectId,
  amount: number,
  action: string,
  metadata?: { auctionId?, usdValue?, ... }
});

// Calculate XP for specific actions
const bidXP = calculateBidXP(usdValue);
const winXP = calculateWinXP(usdValue);

// Get current/past season leaderboards
const leaderboard = await getSeasonLeaderboard(seasonNumber?, limit, offset);
const allTime = await getAllTimeLeaderboard(limit, offset);

// Get user stats
const stats = await getUserXPStats(userId);
const rank = await getUserSeasonRank(userId);

// Level calculations
const level = calculateLevel(totalXP);
const xpNeeded = getXPRequiredForLevel(level);
const xpToNext = getXPToNextLevel(currentXP);
```

## Background Jobs

### Season Rollover
- **Schedule**: 1st of every month at 00:00 UTC
- **Queue**: `season-rollover`
- **Worker**: `apps/worker/handlers/seasonRollover.ts`

**Process**:
1. Archive current season to `SeasonLeaderboard` collection
2. Mark current season as `active: false`
3. Reset all users' `currentSeasonXP` to 0
4. Create next season (automatically calculated dates)

## UI Components

### Leaderboard Page
Location: `apps/web/app/leaderboard/page.tsx`

**Tabs**:
1. **Season XP** - Current season rankings
2. **All-Time XP** - Total XP across all seasons
3. **Top Revenue** - Auction hosts by revenue (existing)
4. **Highest Bids** - Individual highest bids (existing)

**Display**:
- Rank badges (gold/silver/bronze for top 3)
- User avatars and usernames
- XP amount and level indicator
- Responsive design for mobile/desktop

## Setup Instructions

### 1. Environment Variables

Add to `.env.local`:
```env
MONGO_URI=mongodb://...
REDIS_URL=redis://...
ADMIN_SECRET=your-secret-key-here
```

### 2. Initialize Season 1

**Option A - Script**:
```bash
cd scripts
npx tsx init-season.ts
```

**Option B - API**:
```bash
curl -X POST http://localhost:3000/api/admin/init-season \
  -H "X-Admin-Secret: your-secret-key-here"
```

### 3. Start Worker

Ensure the worker is running to process season rollover jobs:
```bash
cd apps/worker
npm run dev
```

## XP Award Integration

XP is automatically awarded in the following API routes:

1. **Auction Creation**: `apps/web/app/api/protected/auctions/create/route.ts`
2. **Bidding**: `apps/web/app/api/protected/auctions/[blockchainAuctionId]/bid/route.ts`
3. **Auction Win**: `apps/web/app/api/protected/auctions/[blockchainAuctionId]/end/route.ts`
4. **Review Submission**: `apps/web/app/api/protected/reviews/create/route.ts`

All XP awards are **non-blocking** - if XP awarding fails, the main action (bid, auction creation, etc.) will still succeed.

## Validation Rules

### XP Award Validations
- ✅ User must exist
- ✅ Season must be active
- ✅ Season dates must include current time
- ✅ No XP for bidding on own auctions
- ❌ No minimum bid amount required (unlike weekly leaderboard)
- ❌ No restrictions on rapid repeated actions

### Level Calculation
- Based solely on `totalXP`
- Automatically updated when XP is awarded
- Never decreases (even when season resets)

## Monitoring & Debugging

### Check Current Season
```javascript
const season = await getCurrentSeason();
console.log(season);
```

### View User XP History
```javascript
const user = await User.findById(userId).select('xpHistory');
console.log(user.xpHistory);
```

### Check Scheduled Jobs
```bash
# In Redis CLI
KEYS *season-rollover*
```

## Future Enhancements

Potential features to add:
- 🏅 Season rewards/badges for top players
- 🔥 XP multipliers during special events
- 📈 Daily login streaks
- 🎁 Referral bonuses
- 💎 Achievement system
- 📊 XP analytics dashboard
- 🎯 Level-based perks (reduced fees, priority support, etc.)

## Troubleshooting

### XP not being awarded
1. Check season is active: `GET /api/admin/init-season`
2. Verify user exists in database
3. Check console logs for XP service errors
4. Ensure dates are within season boundaries

### Season not rolling over
1. Verify worker is running
2. Check Redis connection
3. Review worker logs for errors
4. Manually trigger: Call `resetSeason()` function

### Leaderboard not showing data
1. Ensure Season 1 is initialized
2. Check MongoDB indexes are created
3. Verify users have XP > 0
4. Clear cache if using Redis caching

## Technical Notes

- **Atomic Updates**: Uses MongoDB `$inc` for XP to prevent race conditions
- **Indexing**: Optimized indexes on `currentSeasonXP`, `totalXP`, `level`
- **Error Handling**: All XP operations use try-catch to prevent blocking
- **Scalability**: Leaderboard queries support pagination
- **Audit Trail**: All XP awards logged in `xpHistory`

## Support

For issues or questions:
- Check existing GitHub issues
- Review console logs in browser/server
- Verify environment variables are set correctly
- Ensure database migrations completed successfully
