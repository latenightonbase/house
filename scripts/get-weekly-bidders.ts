/**
 * Script to fetch this week's bidders from the weekly leaderboard
 * Run with: npx ts-node scripts/get-weekly-bidders.ts
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function getWeeklyBidders() {
  try {
    console.log('Fetching weekly bidders...\n');
    
    const response = await fetch(`${API_URL}/api/leaderboard/weekly-bidders`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch weekly bidders');
    }
    
    console.log('=== WEEKLY BIDDERS LEADERBOARD ===');
    console.log(`Week: ${new Date(result.weekStartDate).toLocaleDateString()} - ${new Date(result.weekEndDate).toLocaleDateString()}\n`);
    console.log(`Total bidders: ${result.data.length}\n`);
    
    if (result.data.length === 0) {
      console.log('No bidders found for this week.');
      return;
    }
    
    console.log('Rank | User                          | Total Spent | Bids');
    console.log('-----|-------------------------------|-------------|------');
    
    result.data.forEach((bidder: any, index: number) => {
      const rank = (index + 1).toString().padStart(4);
      const displayName = bidder.display_name || bidder.username || bidder.wallet;
      const name = displayName.length > 28 ? displayName.substring(0, 25) + '...' : displayName;
      const namePadded = name.padEnd(29);
      const spent = `$${bidder.totalSpentUSD.toFixed(2)}`.padStart(11);
      const bids = bidder.bidCount.toString().padStart(5);
      
      console.log(`${rank} | ${namePadded} | ${spent} | ${bids}`);
    });
    
    console.log('\n=== DETAILED VIEW ===\n');
    
    result.data.forEach((bidder: any, index: number) => {
      console.log(`#${index + 1} ${bidder.display_name || bidder.username || 'Anonymous'}`);
      if (bidder.username && bidder.display_name) {
        console.log(`   @${bidder.username}`);
      }
      console.log(`   Wallet: ${bidder.wallet}`);
      console.log(`   Total Spent: $${bidder.totalSpentUSD.toFixed(2)}`);
      console.log(`   Number of Bids: ${bidder.bidCount}`);
      console.log(`   Average Bid: $${(bidder.totalSpentUSD / bidder.bidCount).toFixed(2)}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error fetching weekly bidders:', error);
    process.exit(1);
  }
}

getWeeklyBidders();
