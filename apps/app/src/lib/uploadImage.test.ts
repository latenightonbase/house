import { describe, expect, test } from "bun:test";
import { validateImageFile } from "./uploadImage";

function file(type: string, size = 1024) {
  return new File([new Uint8Array(size)], "upload", { type });
}

describe("validateImageFile", () => {
  test("allows AVIF on avatars and artwork", () => {
    expect(validateImageFile(file("image/avif"), "avatar")).toBeNull();
    expect(validateImageFile(file("image/avif"), "project")).toBeNull();
    expect(validateImageFile(file("image/webp"), "avatar")).toBeNull();
  });

  test("keeps GIF as artwork input only", () => {
    expect(validateImageFile(file("image/gif"), "project")).toBeNull();
    expect(validateImageFile(file("image/gif"), "avatar")).toMatch(/JPEG, PNG, WebP, or AVIF/);
  });

  test("rejects oversized and unknown files", () => {
    expect(validateImageFile(file("image/png", 5 * 1024 * 1024 + 1), "project")).toMatch(/5MB/);
    expect(validateImageFile(file("image/svg+xml"), "project")).toMatch(/GIF/);
  });
});
