import { beforeAll, describe, expect, test } from "bun:test";
import { isOwnPosterUrl } from "./s3Client";

beforeAll(() => {
  process.env.AWS_S3_BUCKET = "house-test";
  process.env.AWS_REGION = "us-east-1";
});

const base = "https://house-test.s3.us-east-1.amazonaws.com";

describe("isOwnPosterUrl", () => {
  test("accepts the user's own poster upload", () => {
    expect(isOwnPosterUrl(`${base}/poster/user_1/abc.avif`, "user_1")).toBe(true);
  });

  test("rejects another user's poster, other prefixes, and other hosts", () => {
    expect(isOwnPosterUrl(`${base}/poster/user_2/abc.avif`, "user_1")).toBe(false);
    expect(isOwnPosterUrl(`${base}/avatar/user_1/abc.avif`, "user_1")).toBe(false);
    expect(isOwnPosterUrl(`${base}/poster/user_10/abc.avif`, "user_1")).toBe(false);
    expect(isOwnPosterUrl("https://evil.example.com/poster/user_1/abc.avif", "user_1")).toBe(false);
    expect(isOwnPosterUrl("not a url", "user_1")).toBe(false);
  });
});
