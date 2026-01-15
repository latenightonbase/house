import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { s3Client, S3_BUCKET_NAME } from './s3Client';
import { getFileExtension } from './imageValidation';

export interface PresignedUrlResult {
  uploadUrl: string;
  imageUrl: string;
  key: string;
}

export async function generatePresignedUrl(
  contentType: string,
  filename: string
): Promise<PresignedUrlResult> {
  const extension = getFileExtension(contentType);
  const key = `auctions/${uuidv4()}-${Date.now()}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 300, // 5 minutes
  });

  const imageUrl = `https://${S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

  return {
    uploadUrl,
    imageUrl,
    key,
  };
}
