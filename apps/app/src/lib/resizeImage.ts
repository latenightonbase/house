import type { UploadPurpose } from "@/lib/uploadImage";

const QUALITY_STEPS = [0.85, 0.7, 0.55, 0.4] as const;

const PRESETS = {
  avatar: { maxEdge: 256, maxBytes: 200 * 1024, basename: "avatar", square: false },
  project: { maxEdge: 1080, maxBytes: 600 * 1024, basename: "artwork", square: true },
} as const;

const FORMATS = [
  { type: "image/avif", ext: "avif" },
  { type: "image/webp", ext: "webp" },
] as const;

type Drawable = {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  close: () => void;
};

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

async function encodeToTarget(
  canvas: HTMLCanvasElement,
  type: string,
  maxBytes: number,
): Promise<Blob | null> {
  for (const quality of QUALITY_STEPS) {
    const blob = await canvasToBlob(canvas, type, quality);
    if (!blob || blob.type !== type || blob.size === 0) return null;
    if (blob.size <= maxBytes) return blob;
  }
  return null;
}

function loadViaElement(file: File): Promise<Drawable> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        draw: (ctx, width, height) => ctx.drawImage(img, 0, 0, width, height),
        close: () => undefined,
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read that image."));
    };
    img.src = objectUrl;
  });
}

async function loadDrawable(file: File): Promise<Drawable> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, width, height) => ctx.drawImage(bitmap, 0, 0, width, height),
        close: () => bitmap.close(),
      };
    } catch {
      /* GIF/AVIF decode can fail in some browsers — fall through. */
    }
  }
  return loadViaElement(file);
}

/**
 * Resize and encode a picked image to a bounded AVIF (or WebP) File.
 * Animated GIFs become the first frame.
 */
export async function processImageForUpload(
  file: File,
  purpose: UploadPurpose,
): Promise<File> {
  const preset = PRESETS[purpose];
  const source = await loadDrawable(file);
  try {
    if (!source.width || !source.height) {
      throw new Error("Could not process image");
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process image");

    if (preset.square) {
      const shortest = Math.min(source.width, source.height);
      const edge = Math.max(1, Math.round(Math.min(shortest, preset.maxEdge)));
      canvas.width = edge;
      canvas.height = edge;
      const scale = edge / shortest;
      const drawW = source.width * scale;
      const drawH = source.height * scale;
      ctx.save();
      ctx.translate((edge - drawW) / 2, (edge - drawH) / 2);
      source.draw(ctx, drawW, drawH);
      ctx.restore();
    } else {
      const scale = Math.min(preset.maxEdge / source.width, preset.maxEdge / source.height, 1);
      canvas.width = Math.max(1, Math.round(source.width * scale));
      canvas.height = Math.max(1, Math.round(source.height * scale));
      source.draw(ctx, canvas.width, canvas.height);
    }

    for (const format of FORMATS) {
      const blob = await encodeToTarget(canvas, format.type, preset.maxBytes);
      if (blob) {
        return new File([blob], `${preset.basename}.${format.ext}`, { type: format.type });
      }
    }

    throw new Error("Image is too large. Try a smaller photo.");
  } finally {
    source.close();
  }
}
