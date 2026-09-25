import { GetObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getFileExtension } from "./imageValidation";
import { getChatFileExtension, sanitizeFileName } from "./fileValidation";
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

/**
 * Chat attachments live under `chat/` and are never linked by public URL. The
 * key is namespaced by conversation so an object can be authorised by checking
 * membership of that conversation alone, and the random segment keeps keys
 * unguessable even before the participant check runs.
 */
export async function generateChatAttachmentUpload(opts: {
  contentType: string;
  conversationId: string;
  userId: string;
  fileName?: string | null;
}): Promise<{ uploadUrl: string; key: string; fileName: string }> {
  const extension = getChatFileExtension(opts.contentType);
  const key = `chat/${opts.conversationId}/${opts.userId}/${crypto.randomUUID()}.${extension}`;

  const uploadUrl = await getSignedUrl(
    getS3Client(),
    new PutObjectCommand({
      Bucket: getS3BucketName(),
      Key: key,
      ContentType: opts.contentType,
    }),
    { expiresIn: 300 },
  );

  return { uploadUrl, key, fileName: sanitizeFileName(opts.fileName, opts.contentType) };
}

/**
 * The real size and type of an uploaded object. A presigned PUT cannot cap the
 * body, so this is the only place the 5MB limit is actually enforced — the
 * caller checks it before writing a message row, and a file that overshoots
 * never becomes a message.
 */
export async function headUploadedObject(
  key: string,
): Promise<{ size: number; contentType: string | null } | null> {
  try {
    const head = await getS3Client().send(
      new HeadObjectCommand({ Bucket: getS3BucketName(), Key: key }),
    );
    return {
      size: Number(head.ContentLength ?? 0),
      contentType: head.ContentType ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * A short-lived read URL for one private object. Issued only after the caller
 * has been confirmed a participant of the conversation the key belongs to.
 * `fileName` drives the download filename rather than exposing the S3 key.
 */
export async function generatePresignedDownload(opts: {
  key: string;
  fileName?: string | null;
  /** PDFs download; images render inline in the thread. */
  inline?: boolean;
  expiresIn?: number;
}): Promise<string> {
  const disposition = opts.inline ? "inline" : "attachment";
  const name = opts.fileName ? sanitizeFileName(opts.fileName, "application/octet-stream") : null;

  return getSignedUrl(
    getS3Client(),
    new GetObjectCommand({
      Bucket: getS3BucketName(),
      Key: opts.key,
      ResponseContentDisposition: name
        ? `${disposition}; filename="${name.replace(/"/g, "")}"`
        : disposition,
    }),
    { expiresIn: opts.expiresIn ?? 300 },
  );
}
