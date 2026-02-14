import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Auction from '@/utils/schemas/Auction';
import User from '@/utils/schemas/User';
import { authenticateRequest } from '@/utils/authService';
import { scheduleAuctionReminders, scheduleAuctionEnd } from '@repo/queue';
import Whitelist from '@/utils/schemas/Whitelist';
import { checkTokenAmount } from '@/utils/checkTokenAmount';
import { generatePresignedUrl } from '@/utils/s3/generatePresignedUrl';
import { validateImageType, validateImageSize } from '@/utils/s3/imageValidation';
import { awardXP, XP_REWARDS } from '@/utils/xpService';

export async function POST(req: NextRequest) {
  console.log('Verifying token in auction creation route');

  const authResult = await authenticateRequest(req);
  if (!authResult.success) {
    return authResult.response;
  }
  
  try {
    // Parse FormData
    const formData = await req.formData();
    const auctionName = formData.get('auctionName') as string;
    const description = formData.get('description') as string | null;
    const tokenAddress = formData.get('tokenAddress') as string;
    const endDate = formData.get('endDate') as string;
    const startDate = formData.get('startDate') as string;
    const hostedBy = formData.get('hostedBy') as string;
    const hostPrivyId = formData.get('hostPrivyId') as string | null;
    const minimumBid = formData.get('minimumBid') as string;
    const blockchainAuctionId = formData.get('blockchainAuctionId') as string;
    const currency = formData.get('currency') as string;
    const creationHash = formData.get('creationHash') as string | null;
    const startingWallet = formData.get('startingWallet') as string;
    const imageFile = formData.get('image') as File | null;

    let imageUrl: string | undefined;
    let imageKey: string | undefined;

    // Upload image to S3 if provided
    if (imageFile) {
      try {
        console.log('Processing image upload...');
        
        // Validate file type
        const typeValidation = validateImageType(imageFile.type);
        if (!typeValidation.valid) {
          return NextResponse.json({ error: typeValidation.error }, { status: 400 });
        }

        // Validate file size
        const sizeValidation = validateImageSize(imageFile.size);
        if (!sizeValidation.valid) {
          return NextResponse.json({ error: sizeValidation.error }, { status: 400 });
        }

        // Generate presigned URL
        const { uploadUrl, imageUrl: s3ImageUrl, key } = await generatePresignedUrl(
          imageFile.type,
          imageFile.name
        );

        // Convert File to ArrayBuffer for upload
        const arrayBuffer = await imageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to S3
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': imageFile.type,
          },
          body: buffer,
        });

        if (!uploadResponse.ok) {
          console.error('S3 upload failed:', await uploadResponse.text());
          return NextResponse.json(
            { error: 'Failed to upload image to S3' },
            { status: 500 }
          );
        }

        imageUrl = s3ImageUrl;
        imageKey = key;
        console.log('Image uploaded successfully:', imageUrl);
      } catch (error) {
        console.error('Error uploading image:', error);
        return NextResponse.json(
          { error: 'Failed to upload image' },
          { status: 500 }
        );
      }
    }

    const checkWl = await Whitelist.findOne({
      walletAddress: startingWallet.toLowerCase(),
    })

    if (!checkWl) {
      await checkTokenAmount(startingWallet).then((hasEnough) => {
      if (hasEnough.allow == false) {
        throw new Error('Insufficient token balance in starting wallet');
      }}).catch((err) => {
        console.error('Token amount check failed:', err);
        return NextResponse.json({ error: 'Insufficient token balance in starting wallet' }, { status: 403 });
      });
    }

    console.log('Creating auction with data:', {
      auctionName,
      description,
      tokenAddress,
      endDate,
      startDate,
      hostedBy,
      minimumBid,
      blockchainAuctionId,
      currency,
      startingWallet,
      hasImage: !!imageUrl,
    });

    if (!auctionName || !tokenAddress || !endDate || !startDate || !hostedBy || !minimumBid) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (auctionName.length > 30) {
      return NextResponse.json({ error: 'Auction title cannot exceed 30 characters' }, { status: 400 });
    }

    if (description && description.length > 200) {
      return NextResponse.json({ error: 'Description cannot exceed 200 characters' }, { status: 400 });
    }

    await dbConnect();

    var user:any;

    if(hostPrivyId) {
      user = await User.findOne({ privyId: hostPrivyId });
    }
    else{
      user = await User.findOne({ socialId: hostedBy });
    }

    console.log('Hosting user:', user);

    if (!user) {
      return NextResponse.json({ error: 'Hosting user not found' }, { status: 404 });
    }

    const newAuction = new Auction({
      auctionName,
      description: description || undefined,
      currency,
      tokenAddress,
      blockchainAuctionId,
      creationHash,
      endDate: new Date(endDate),
      hostedBy: user._id,
      minimumBid: parseFloat(minimumBid),
      startingWallet: startingWallet,
      imageUrl: imageUrl || undefined,
      imageKey: imageKey || undefined,
      createdByType: 'human',
    });

    await newAuction.save();

    user.hostedAuctions.push(newAuction._id);

    await user.save();

    // Award XP for creating auction
    let xpAwarded = 0;
    try {
      const xpResult = await awardXP({
        userId: user._id,
        amount: XP_REWARDS.CREATE_AUCTION,
        action: 'CREATE_AUCTION',
        metadata: {
          auctionId: newAuction._id,
          auctionName: newAuction.auctionName,
        },
      });
      if (xpResult.success) {
        xpAwarded = XP_REWARDS.CREATE_AUCTION;
        console.log(`✅ Awarded ${xpAwarded} XP for auction creation`);
      }
    } catch (err) {
      console.error('⚠️ Failed to award XP for auction creation:', err);
    }

    // Schedule jobs (non-blocking)
    try {
      const [reminderResult, endResult] = await Promise.all([
        scheduleAuctionReminders(
          newAuction._id.toString(),
          parseInt(blockchainAuctionId),
          auctionName,
          new Date(startDate),
          new Date(endDate)
        ),
        scheduleAuctionEnd(
          newAuction._id.toString(),
          blockchainAuctionId,
          auctionName,
          new Date(endDate)
        ),
      ]);
      console.log('Reminder scheduling result:', reminderResult);
      console.log('End job scheduling result:', endResult);
    } catch (err) {
      console.error('Failed to schedule jobs (non-blocking):', err);
    }

    return NextResponse.json(
      { 
        message: 'Auction created successfully', 
        auction: newAuction,
        xpAwarded,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating auction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}