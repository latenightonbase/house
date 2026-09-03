import { S3Client } from "@aws-sdk/client-s3";

let client: S3Client | null = null;

export function getS3Region(): string {
  const region = process.env.AWS_REGION;
  if (!region) throw new Error("AWS_REGION environment variable is required");
  return region;
}

export function getS3BucketName(): string {
  const bucketName = process.env.AWS_S3_BUCKET;
  if (!bucketName) throw new Error("AWS_S3_BUCKET environment variable is required");
  return bucketName;
}

export function getS3Client(): S3Client {
  if (client) return client;

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are required");
  }

  client = new S3Client({
    region: getS3Region(),
    credentials: { accessKeyId, secretAccessKey },
    // Browser PUTs only send Content-Type; default flexible checksums would 403.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return client;
}

/** Hosts we emit and accept for public object URLs. */
export function getS3PublicHosts(): string[] {
  const bucket = getS3BucketName();
  const region = getS3Region();
  return [`${bucket}.s3.${region}.amazonaws.com`, `${bucket}.s3.amazonaws.com`];
}

export function publicUrlForKey(key: string): string {
  return `https://${getS3BucketName()}.s3.${getS3Region()}.amazonaws.com/${key}`;
}

export function isOurS3Url(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return false;
    if (!getS3PublicHosts().includes(url.hostname)) return false;
    return url.pathname.length > 1 && url.pathname.length <= 600;
  } catch {
    return false;
  }
}
