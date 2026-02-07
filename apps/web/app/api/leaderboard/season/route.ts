import { NextRequest, NextResponse } from 'next/server';
import {
  getSeasonLeaderboard,
  getAllTimeLeaderboard,
  getUserSeasonRank,
  getUserAllTimeRank,
  getCurrentSeason,
} from '@/utils/xpService';
import dbConnect from '@/utils/db';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'season'; // 'season' or 'alltime'
    const seasonNumber = searchParams.get('seasonNumber');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Validate limits
    if (limit < 1 || limit > 1000) {
      return NextResponse.json({ error: 'Limit must be between 1 and 1000' }, { status: 400 });
    }

    if (offset < 0) {
      return NextResponse.json({ error: 'Offset must be non-negative' }, { status: 400 });
    }

    let leaderboard: any[] = [];
    let seasonInfo = null;

    if (type === 'alltime') {
      // Get all-time leaderboard
      leaderboard = await getAllTimeLeaderboard(limit, offset);
    } else {
      // Get season leaderboard
      if (seasonNumber) {
        const sNum = parseInt(seasonNumber);
        if (isNaN(sNum) || sNum < 1) {
          return NextResponse.json({ error: 'Invalid season number' }, { status: 400 });
        }
        leaderboard = await getSeasonLeaderboard(sNum, limit, offset);
        seasonInfo = { seasonNumber: sNum, active: false };
      } else {
        // Current season
        const currentSeason = await getCurrentSeason();
        if (currentSeason) {
          leaderboard = await getSeasonLeaderboard(undefined, limit, offset);
          seasonInfo = {
            seasonNumber: currentSeason.seasonNumber,
            active: currentSeason.active,
            startDate: currentSeason.startDate,
            endDate: currentSeason.endDate,
          };
        } else {
          leaderboard = [];
          seasonInfo = { message: 'No active season' };
        }
      }
    }

    return NextResponse.json({
      success: true,
      type,
      season: seasonInfo,
      leaderboard,
      pagination: {
        limit,
        offset,
        returned: leaderboard.length,
      },
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
