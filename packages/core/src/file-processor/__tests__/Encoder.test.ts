import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import { Encoder } from "../Encoder.js";
import { FileErrorCode } from "../types.js";

const FIXTURES = join(__dirname, "..", "__fixtures__");
const encoder = new Encoder();

describe("Encoder", () => {
  describe("getFileSize()", () => {
    it("returns correct size for test PNG", async () => {
      const size = await encoder.getFileSize(join(FIXTURES, "test-image.png"));
      expect(size).toBeGreaterThan(0);
    });

    it("returns 0 for empty file", async () => {
      const size = await encoder.getFileSize(join(FIXTURES, "empty-file"));
      expect(size).toBe(0);
    });

    it("throws FILE_NOT_FOUND for missing file", async () => {
      await expect(encoder.getFileSize(join(FIXTURES, "nonexistent"))).rejects.toThrow(
        expect.objectContaining({
          code: FileErrorCode.FILE_NOT_FOUND,
        }),
      );
    });
  });

  describe("encode()", () => {
    it("encodes a PNG file to valid base64", async () => {
      const result = await encoder.encode(join(FIXTURES, "test-image.png"), "image/png");
      expect(result).toBeTruthy();
      expect(result).toMatch(/^[A-Za-z0-9+/]+=*$/);
      const decoded = Buffer.from(result, "base64");
      expect(decoded[0]).toBe(0x89);
      expect(decoded[1]).toBe(0x50);
    });

    it("encodes a JPEG file to valid base64", async () => {
      const result = await encoder.encode(join(FIXTURES, "test-image.jpg"), "image/jpeg");
      expect(result).toBeTruthy();
      expect(result).toMatch(/^[A-Za-z0-9+/]+=*$/);
      const decoded = Buffer.from(result, "base64");
      expect(decoded[0]).toBe(0xff);
      expect(decoded[1]).toBe(0xd8);
    });

    it("encodes a WebP file to valid base64", async () => {
      const result = await encoder.encode(join(FIXTURES, "test-image.webp"), "image/webp");
      expect(result).toBeTruthy();
      expect(result).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it("encodes a PDF file to valid base64", async () => {
      const result = await encoder.encode(join(FIXTURES, "test-document.pdf"), "application/pdf");
      expect(result).toBeTruthy();
      expect(result).toMatch(/^[A-Za-z0-9+/]+=*$/);
      const decoded = Buffer.from(result, "base64");
      expect(decoded[0]).toBe(0x25);
      expect(decoded[1]).toBe(0x50);
    });

    it("throws FILE_TOO_LARGE when file exceeds max size", async () => {
      await expect(
        encoder.encode(join(FIXTURES, "test-image.png"), "image/png", 1),
      ).rejects.toThrow(
        expect.objectContaining({
          code: FileErrorCode.FILE_TOO_LARGE,
          message: expect.stringContaining("too large"),
        }),
      );
    });

    it("respects maxSizeOverride parameter", async () => {
      const result = await encoder.encode(
        join(FIXTURES, "test-image.png"),
        "image/png",
        1024 * 1024,
      );
      expect(result).toBeTruthy();
    });

    it("handles empty file gracefully", async () => {
      const result = await encoder.encode(join(FIXTURES, "empty-file"), "image/png");
      expect(result).toBe("");
    });
  });

  describe("encodeRange()", () => {
    it("encodes a byte range from a file", async () => {
      const filePath = join(FIXTURES, "test-document.pdf");
      const result = await encoder.encodeRange(filePath, 0, 10);
      expect(result).toBeTruthy();
      const decoded = Buffer.from(result, "base64");
      expect(decoded.length).toBeLessThanOrEqual(10);
      expect(decoded[0]).toBe(0x25);
    });

    it("returns partial data when range exceeds file size", async () => {
      const filePath = join(FIXTURES, "test-image.png");
      const fileSize = await encoder.getFileSize(filePath);
      const result = await encoder.encodeRange(filePath, 0, fileSize + 1000);
      const decoded = Buffer.from(result, "base64");
      expect(decoded.length).toBe(fileSize);
    });

    it("returns empty for offset beyond file size", async () => {
      const filePath = join(FIXTURES, "test-image.png");
      const result = await encoder.encodeRange(filePath, 999999, 10);
      const decoded = Buffer.from(result, "base64");
      expect(decoded.length).toBe(0);
    });
  });

  describe("streaming encode", () => {
    it("encodes larger files via streaming path", async () => {
      const largeFilePath = join(FIXTURES, "_large_test_file.bin");
      try {
        const header = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
        const padding = Buffer.alloc(2 * 1024 * 1024 - header.length, 0x42);
        writeFileSync(largeFilePath, Buffer.concat([header, padding]));

        const result = await encoder.encode(largeFilePath, "image/png");
        expect(result).toBeTruthy();
        expect(result).toMatch(/^[A-Za-z0-9+/]+=*$/);

        const decoded = Buffer.from(result, "base64");
        expect(decoded.length).toBe(2 * 1024 * 1024);
        expect(decoded[0]).toBe(0x89);
      } finally {
        if (existsSync(largeFilePath)) unlinkSync(largeFilePath);
      }
    });
  });
});
