export type UploadPurpose = "avatar" | "project";

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
] as const;
export const AVATAR_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function validateImageFile(file: File, purpose: UploadPurpose): string | null {
  const allowed = purpose === "avatar" ? AVATAR_IMAGE_TYPES : ALLOWED_IMAGE_TYPES;
  if (!(allowed as readonly string[]).includes(file.type)) {
    return purpose === "avatar"
      ? "Choose a JPEG, PNG, WebP, or AVIF image."
      : "Choose a JPEG, PNG, WebP, AVIF, or GIF image.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Image must be 5MB or smaller.";
  }
  return null;
}

/** Presign on the API, then PUT the file directly to S3. Returns the public URL. */
export async function uploadImage(file: File, purpose: UploadPurpose): Promise<string> {
  const invalid = validateImageFile(file, purpose);
  if (invalid) throw new Error(invalid);

  const res = await fetch("/backend/uploads/presign", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType: file.type, purpose }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    uploadUrl?: string;
    publicUrl?: string;
  };
  if (!res.ok || !data.uploadUrl || !data.publicUrl) {
    throw new Error(data.error || "Could not start upload");
  }

  const put = await fetch(data.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!put.ok) {
    throw new Error("Upload failed. Confirm the S3 bucket allows CORS from this origin.");
  }
  return data.publicUrl;
}
