import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/utils/db';
import Auction from '@/utils/schemas/Auction';
import User from '@/utils/schemas/User';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { auctionName, tokenAddress, endDate, startDate, hostedBy, minimumBid } = req.body;

  if (!auctionName || !tokenAddress || !endDate || !startDate || !hostedBy || !minimumBid) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  

  try {
    await dbConnect();

    const user = await User.findOne({ wallet: hostedBy });
    if (!user) {
      return res.status(404).json({ error: 'Hosting user not found' });
    }

    const newAuction = new Auction({
      auctionName,
      tokenAddress,
      endDate,
      startDate,
      hostedBy: user._id,
      minimumBid,
    });

    await newAuction.save();

    return res.status(201).json({ message: 'Auction created successfully', auction: newAuction });
  } catch (error) {
    console.error('Error creating auction:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}