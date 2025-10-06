# Database Query Guide

This document explains how to perform all 10 required queries with the enhanced MongoDB schemas.

## 1. All bids won by a user

```javascript
// Get all winning bids for a user
const userWins = await User.findById(userId)
  .populate({
    path: 'bidsWon',
    populate: {
      path: 'auction',
      select: 'auctionName endDate currency'
    }
  });

// Alternative: Direct query on WinningBid
const winningBids = await WinningBid.find({ user: userId })
  .populate('auction', 'auctionName endDate currency')
  .sort({ createdAt: -1 });
```

## 2. All bids of a user (including non-winning bids)

```javascript
// Get all auctions where user has placed bids
const userBids = await Auction.find({
  'bidders.user': userId
}, {
  auctionName: 1,
  endDate: 1,
  currency: 1,
  bidders: { $elemMatch: { user: userId } }
}).populate('bidders.user', 'wallet fid');

// Alternative: Get full bidding history
const biddingHistory = await Auction.aggregate([
  { $match: { 'bidders.user': new mongoose.Types.ObjectId(userId) } },
  { $unwind: '$bidders' },
  { $match: { 'bidders.user': new mongoose.Types.ObjectId(userId) } },
  { $sort: { 'bidders.bidTimestamp': -1 } }
]);
```

## 3. Get all auctions a user has participated in

```javascript
// Using the participatedAuctions field
const participatedAuctions = await User.findById(userId)
  .populate({
    path: 'participatedAuctions',
    select: 'auctionName startDate endDate currency hostedBy winningBid',
    populate: {
      path: 'hostedBy',
      select: 'wallet fid'
    }
  });

// Alternative: Query auctions directly
const auctions = await Auction.find({
  'bidders.user': userId
}).select('auctionName startDate endDate currency hostedBy winningBid');
```

## 4. The winner of an auction

```javascript
// Get winner using winningBid reference
const auctionWinner = await Auction.findById(auctionId)
  .populate({
    path: 'winningBid',
    populate: {
      path: 'user',
      select: 'wallet fid'
    }
  });

// Alternative: Get winner directly from highest bidder
const auction = await Auction.findById(auctionId).populate('bidders.user', 'wallet fid');
const highestBidder = auction.highestBidder; // Using virtual
```

## 5. All auctions hosted by a user

```javascript
// Using hostedAuctions field
const hostedAuctions = await User.findById(userId)
  .populate({
    path: 'hostedAuctions',
    select: 'auctionName startDate endDate currency totalRevenue winningBid',
    populate: {
      path: 'winningBid',
      select: 'usdcAmount'
    }
  });

// Alternative: Direct query
const auctions = await Auction.find({ hostedBy: userId })
  .populate('winningBid', 'usdcAmount')
  .sort({ createdAt: -1 });
```

## 6. All winners of auctions hosted by a particular user

```javascript
// Get all winning bids from user's hosted auctions
const hostedAuctionWinners = await Auction.aggregate([
  { $match: { hostedBy: new mongoose.Types.ObjectId(userId) } },
  { $lookup: {
    from: 'winningbids',
    localField: 'winningBid',
    foreignField: '_id',
    as: 'winner'
  }},
  { $unwind: { path: '$winner', preserveNullAndEmptyArrays: true } },
  { $lookup: {
    from: 'users',
    localField: 'winner.user',
    foreignField: '_id',
    as: 'winnerUser'
  }},
  { $unwind: { path: '$winnerUser', preserveNullAndEmptyArrays: true } },
  { $project: {
    auctionName: 1,
    endDate: 1,
    'winner.usdcAmount': 1,
    'winnerUser.wallet': 1,
    'winnerUser.fid': 1
  }}
]);
```

## 7. Win:Participated ratio of a user

```javascript
// Calculate win/participation ratio
const userStats = await User.aggregate([
  { $match: { _id: new mongoose.Types.ObjectId(userId) } },
  { $project: {
    totalWins: { $size: '$bidsWon' },
    totalParticipations: { $size: '$participatedAuctions' },
    winRatio: {
      $cond: [
        { $gt: [{ $size: '$participatedAuctions' }, 0] },
        { $divide: [{ $size: '$bidsWon' }, { $size: '$participatedAuctions' }] },
        0
      ]
    }
  }}
]);

// Alternative: Include percentage
const ratio = userStats[0];
ratio.winPercentage = ratio.winRatio * 100;
```

## 8. Net income of a host from auctions

```javascript
// Calculate total host revenue from all auctions
const hostIncome = await Auction.aggregate([
  { $match: { hostedBy: new mongoose.Types.ObjectId(userId) } },
  { $group: {
    _id: '$hostedBy',
    totalRevenue: { $sum: '$totalRevenue' },
    totalHostFees: { $sum: { $multiply: ['$totalRevenue', { $divide: ['$hostFeePercentage', 100] }] } },
    auctionCount: { $sum: 1 },
    avgFeePercentage: { $avg: '$hostFeePercentage' }
  }}
]);

// Alternative: Using virtual field
const auctions = await Auction.find({ hostedBy: userId });
const totalIncome = auctions.reduce((sum, auction) => sum + auction.hostRevenue, 0);
```

## 9. Global leaderboard for winning bids

```javascript
// Top winners by total USDC won
const leaderboard = await WinningBid.aggregate([
  { $group: {
    _id: '$user',
    totalWon: { $sum: '$usdcAmount' },
    totalWins: { $sum: 1 },
    avgWinAmount: { $avg: '$usdcAmount' },
    lastWin: { $max: '$createdAt' }
  }},
  { $lookup: {
    from: 'users',
    localField: '_id',
    foreignField: '_id',
    as: 'user'
  }},
  { $unwind: '$user' },
  { $sort: { totalWon: -1 } },
  { $limit: 100 },
  { $project: {
    'user.wallet': 1,
    'user.fid': 1,
    totalWon: 1,
    totalWins: 1,
    avgWinAmount: 1,
    lastWin: 1
  }}
]);

// Alternative: Biggest single wins
const biggestWins = await WinningBid.find()
  .populate('user', 'wallet fid')
  .populate('auction', 'auctionName endDate')
  .sort({ usdcAmount: -1 })
  .limit(50);
```

## 10. Most popular currency in use in auctions

```javascript
// Currency popularity by auction count
const currencyStats = await Auction.aggregate([
  { $group: {
    _id: '$currency',
    auctionCount: { $sum: 1 },
    totalVolume: { $sum: '$totalRevenue' },
    avgAuctionValue: { $avg: '$totalRevenue' },
    recentAuctions: { $sum: { $cond: [
      { $gte: ['$endDate', new Date(Date.now() - 30*24*60*60*1000)] }, // Last 30 days
      1,
      0
    ]}}
  }},
  { $sort: { auctionCount: -1 } }
]);

// Alternative: Include active auctions only
const activeCurrencyStats = await Auction.aggregate([
  { $match: { 
    startDate: { $lte: new Date() },
    endDate: { $gte: new Date() }
  }},
  { $group: {
    _id: '$currency',
    activeAuctions: { $sum: 1 },
    totalCurrentVolume: { $sum: '$totalRevenue' }
  }},
  { $sort: { activeAuctions: -1 } }
]);
```

## Performance Optimization Tips

1. **Use indexes**: All schemas include optimized indexes for these queries
2. **Populate selectively**: Only fetch fields you need
3. **Use aggregation**: For complex calculations and grouping
4. **Cache frequent queries**: Consider caching leaderboards and stats
5. **Pagination**: Use skip/limit for large result sets
6. **Virtual fields**: Leverage virtual fields for computed values

## Maintaining Data Consistency

When implementing these queries, ensure you:

1. **Update participatedAuctions** when a user places a bid
2. **Update bidsWon** when an auction ends with a winner
3. **Update totalRevenue** when a winning bid is finalized
4. **Use transactions** for operations that update multiple collections
5. **Validate bid amounts** against minimum bid and reserve prices