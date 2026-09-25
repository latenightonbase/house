/**
 * What a direct message is allowed to carry: the image types the rest of the
 * app already accepts, plus PDF. The 5MB ceiling is enforced three times —
 * in the browser before the upload starts, as a declared size the presign
 * endpoint rejects, and against the object's real `ContentLength` before the
 * message row is written. Only the last one is trustworthy, since a presigned
 * PUT cannot itself cap the body size.
 */

export const CHAT_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
] as const;

export const CHAT_DOCUMENT_TYPES = ["application/pdf"] as const;

export const CHAT_ATTACHMENT_TYPES = [...CHAT_IMAGE_TYPES, ...CHAT_DOCUMENT_TYPES] as const;

export const MAX_CHAT_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export type FileValidationResult = { valid: true } | { valid: false; error: string };

export function isChatImage(contentType: string): boolean {
  return (CHAT_IMAGE_TYPES as readonly string[]).includes(contentType);
}

export function validateChatAttachmentType(contentType: string): FileValidationResult {
  if (!(CHAT_ATTACHMENT_TYPES as readonly string[]).includes(contentType)) {
    return {
      valid: false,
      error: "Attachments must be a JPEG, PNG, WebP, AVIF, GIF, or PDF.",
    };
  }
  return { valid: true };
}

export function validateChatAttachmentSize(bytes: number): FileValidationResult {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return { valid: false, error: "Attachment is empty." };
  }
  if (bytes > MAX_CHAT_ATTACHMENT_BYTES) {
    return { valid: false, error: "Attachments must be 5MB or smaller." };
  }
  return { valid: true };
}

export function getChatFileExtension(contentType: string): string {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/gif": "gif",
    "application/pdf": "pdf",
  };
  return extensions[contentType] || "bin";
}

/** Strips path separators and control characters off a user-supplied filename. */
export function sanitizeFileName(raw: string | null | undefined, contentType: string): string {
  const fallback = `attachment.${getChatFileExtension(contentType)}`;
  if (!raw) return fallback;
  const cleaned = Array.from(raw.replace(/[\\/]/g, "-"))
    // Drop C0/C1 control characters rather than matching them in a literal
    // character class, which is easy to corrupt when this file is edited.
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code > 0x1f && code !== 0x7f;
    })
    .join("")
    .trim()
    .slice(0, 120);
  return cleaned || fallback;
}
