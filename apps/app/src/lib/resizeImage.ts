const MAX_EDGE = 256;
const MAX_BYTES = 200 * 1024;

/** Resize a picked image to a JPEG data URL that fits the profile size cap. */
export function resizeImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(MAX_EDGE / img.width, MAX_EDGE / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not process image"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.85, 0.7, 0.55, 0.4]) {
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        const comma = dataUrl.indexOf(",");
        const b64 = dataUrl.slice(comma + 1);
        const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
        const bytes = Math.floor((b64.length * 3) / 4) - padding;
        if (bytes <= MAX_BYTES) {
          resolve(dataUrl);
          return;
        }
      }
      reject(new Error("Image is too large. Try a smaller photo."));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read that image."));
    };
    img.src = objectUrl;
  });
}
