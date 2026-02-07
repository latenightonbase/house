import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Season from '@/utils/schemas/Season';
import { scheduleSeasonRollover } from '@repo/queue';

export async function POST(req: NextRequest) {
  try {
    // Check for admin secret
    const adminSecret = req.headers.get('x-admin-secret');
    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Check if Season 1 already exists
    const existingSeason = await Season.findOne({ seasonNumber: 1 });
    
    if (existingSeason) {
      return NextResponse.json({
        success: false,
        message: 'Season 1 already exists',
        season: {
          seasonNumber: existingSeason.seasonNumber,
          startDate: existingSeason.startDate,
          endDate: existingSeason.endDate,
          active: existingSeason.active,
        },
      }, { status: 400 });
    }

    // Create Season 1: Feb 1, 2026 - Feb 28, 2026
    const season1Start = new Date('2026-02-01T00:00:00.000Z');
    const season1End = new Date('2026-02-28T23:59:59.999Z');

    const season1 = await Season.create({
      seasonNumber: 1,
      startDate: season1Start,
      endDate: season1End,
      active: true,
      totalXPAwarded: 0,
      totalParticipants: 0,
    });

    // Schedule the season rollover job
    let rolloverScheduled = false;
    let rolloverInfo = null;
    
    try {
      const rolloverResult = await scheduleSeasonRollover(season1End);
      rolloverScheduled = rolloverResult.scheduled || false;
      rolloverInfo = rolloverResult;
    } catch (error) {
      console.error('Failed to schedule season rollover:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Season 1 initialized successfully',
      season: {
        id: season1._id,
        seasonNumber: season1.seasonNumber,
        startDate: season1.startDate,
        endDate: season1.endDate,
        active: season1.active,
      },
      rollover: {
        scheduled: rolloverScheduled,
        info: rolloverInfo,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Error initializing season:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const seasons = await Season.find().sort({ seasonNumber: 1 });

    return NextResponse.json({
      success: true,
      seasons: seasons.map(s => ({
        seasonNumber: s.seasonNumber,
        startDate: s.startDate,
        endDate: s.endDate,
        active: s.active,
        totalXPAwarded: s.totalXPAwarded,
        totalParticipants: s.totalParticipants,
      })),
    });
  } catch (error) {
    console.error('Error fetching seasons:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
