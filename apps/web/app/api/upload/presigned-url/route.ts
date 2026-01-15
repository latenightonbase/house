import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/utils/authService';
import { generatePresignedUrl } from '@/utils/s3/generatePresignedUrl';
import { validateImageType } from '@/utils/s3/imageValidation';

export async function POST(req: NextRequest) {
  try {
    // Authenticate request
    const authResult = await authenticateRequest(req);
    if (!authResult.success) {
      return authResult.response;
    }

    // Parse request body
    const { contentType, filename } = await req.json();

    if (!contentType || !filename) {
      return NextResponse.json(
        { error: 'Missing required fields: contentType, filename' },
        { status: 400 }
      );
    }

    // Validate image type
    const typeValidation = validateImageType(contentType);
    if (!typeValidation.valid) {
      return NextResponse.json(
        { error: typeValidation.error },
        { status: 400 }
      );
    }

    // Generate presigned URL
    const result = await generatePresignedUrl(contentType, filename);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}
