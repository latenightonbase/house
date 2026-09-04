export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
] as const;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type ImageValidationResult = { valid: true } | { valid: false; error: string };

export function validateImageType(contentType: string): ImageValidationResult {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(contentType)) {
    return {
      valid: false,
      error: "Invalid file type. Please upload a JPEG, PNG, WebP, AVIF, or GIF image.",
    };
  }
  return { valid: true };
}

export function getFileExtension(contentType: string): string {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/gif": "gif",
  };
  return extensions[contentType] || "jpg";
}
