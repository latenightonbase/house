import { describe, expect, test } from "bun:test";
import { processImageForUpload } from "./resizeImage";

/** 1×1 opaque PNG. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

/** 1×1 JPEG. */
const JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wAAAQEB/9oADAMBAAIQAxAAAAGf/9k=",
  "base64",
);

/** 1×1 WebP. */
const WEBP = Buffer.from("UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=", "base64");

function asFile(bytes: Buffer, name: string, type: string) {
  return new File([new Uint8Array(bytes)], name, { type });
}

const hasCanvas =
  typeof document !== "undefined" && typeof document.createElement === "function";

describe("processImageForUpload", () => {
  test.skipIf(!hasCanvas)("encodes common inputs to AVIF or WebP within artwork bounds", async () => {

    for (const [label, file] of [
      ["png", asFile(PNG, "dot.png", "image/png")],
      ["jpeg", asFile(JPEG, "dot.jpg", "image/jpeg")],
      ["webp", asFile(WEBP, "dot.webp", "image/webp")],
    ] as const) {
      const out = await processImageForUpload(file, "project");
      expect(["image/avif", "image/webp"], label).toContain(out.type);
      expect(out.size).toBeGreaterThan(0);
      expect(out.size).toBeLessThanOrEqual(600 * 1024);
      expect(out.name).toMatch(/^artwork\.(avif|webp)$/);
    }
  });
});
