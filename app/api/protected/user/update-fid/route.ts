import { NextRequest, NextResponse } from 'next/server';
import User from '../../../../../utils/schemas/User';
import connectToDB from '@/utils/db';

export async function POST(req: NextRequest) {
	try {
		await connectToDB();
		
		// Get the request body
		const body = await req.json();
		const { wallet, fid } = body;

		if (!wallet || !fid) {
			return NextResponse.json({ error: 'Missing wallet or fid in request body' }, { status: 400 });
		}

		// Find user by wallet address
		const user = await User.findOne({ wallet: wallet });
		
		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		// Check if current fid starts with "none"
		if (!user.fid || user.fid.startsWith('none')) {
			// Update the fid
			user.fid = fid;
			await user.save();
			

			return NextResponse.json({ 
				success: true, 
				message: 'FID updated successfully',
				user: user 
			});
		} else {
			return NextResponse.json({ 
				success: false, 
				message: 'User FID does not need updating',
				user: user 
			});
		}

	} catch (error: any) {
		console.error('Error updating user FID:', error);
		return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
	}
}