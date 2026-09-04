import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getFileExtension } from "./imageValidation";
import { getS3BucketName, getS3Client, publicUrlForKey } from "./s3Client";

export type UploadPurpose = "avatar" | "project";

export async function generatePresignedUpload(opts: {
  contentType: string;
  purpose: UploadPurpose;
  userId: string;
}): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  const extension = getFileExtension(opts.contentType);
  const key = `${opts.purpose}/${opts.userId}/${crypto.randomUUID()}.${extension}`;

  const uploadUrl = await getSignedUrl(
    getS3Client(),
    new PutObjectCommand({
      Bucket: getS3BucketName(),
      Key: key,
      ContentType: opts.contentType,
    }),
    { expiresIn: 300 },
  );

  return { uploadUrl, publicUrl: publicUrlForKey(key), key };
}
