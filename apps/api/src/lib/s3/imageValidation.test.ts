import { describe, expect, test } from "bun:test";
import { getFileExtension, validateImageType } from "./imageValidation";

describe("validateImageType", () => {
  test("accepts generated AVIF and WebP", () => {
    expect(validateImageType("image/avif")).toEqual({ valid: true });
    expect(validateImageType("image/webp")).toEqual({ valid: true });
  });

  test("accepts picker formats including GIF", () => {
    expect(validateImageType("image/jpeg")).toEqual({ valid: true });
    expect(validateImageType("image/png")).toEqual({ valid: true });
    expect(validateImageType("image/gif")).toEqual({ valid: true });
  });

  test("rejects unknown types", () => {
    expect(validateImageType("image/svg+xml").valid).toBe(false);
    expect(validateImageType("application/pdf").valid).toBe(false);
  });
});

describe("getFileExtension", () => {
  test("maps AVIF to .avif keys", () => {
    expect(getFileExtension("image/avif")).toBe("avif");
    expect(getFileExtension("image/webp")).toBe("webp");
    expect(getFileExtension("image/jpeg")).toBe("jpg");
    expect(getFileExtension("image/gif")).toBe("gif");
  });
});
