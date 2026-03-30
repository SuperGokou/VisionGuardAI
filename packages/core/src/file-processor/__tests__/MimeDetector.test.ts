import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { MimeDetector } from "../MimeDetector.js";
import { FileErrorCode, FileProcessorError } from "../types.js";

const FIXTURES = join(__dirname, "..", "__fixtures__");
const detector = new MimeDetector();

describe("MimeDetector", () => {
  describe("detect()", () => {
    it("detects PNG files via magic bytes", async () => {
      const result = await detector.detect(join(FIXTURES, "test-image.png"));
      expect(result).toBe("image/png");
    });

    it("detects JPEG files via magic bytes", async () => {
      const result = await detector.detect(join(FIXTURES, "test-image.jpg"));
      expect(result).toBe("image/jpeg");
    });

    it("detects WebP files via RIFF + WEBP marker", async () => {
      const result = await detector.detect(join(FIXTURES, "test-image.webp"));
      expect(result).toBe("image/webp");
    });

    it("detects PDF files via magic bytes", async () => {
      const result = await detector.detect(join(FIXTURES, "test-document.pdf"));
      expect(result).toBe("application/pdf");
    });

    it("throws FILE_NOT_FOUND for missing file", async () => {
      await expect(detector.detect(join(FIXTURES, "nonexistent.png"))).rejects.toThrow(
        expect.objectContaining({
          code: FileErrorCode.FILE_NOT_FOUND,
          name: "FileProcessorError",
        }),
      );
    });

    it("throws UNSUPPORTED_TYPE for empty file", async () => {
      await expect(detector.detect(join(FIXTURES, "empty-file"))).rejects.toThrow(
        expect.objectContaining({
          code: FileErrorCode.UNSUPPORTED_TYPE,
        }),
      );
    });

    it("throws UNSUPPORTED_TYPE for unknown binary type", async () => {
      await expect(detector.detect(join(FIXTURES, "unknown-type.bin"))).rejects.toThrow(
        expect.objectContaining({
          code: FileErrorCode.UNSUPPORTED_TYPE,
        }),
      );
    });
  });

  describe("detectFromBytes()", () => {
    it("returns image/png for PNG magic bytes", () => {
      const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00]);
      expect(detector.detectFromBytes(header, "test.png")).toBe("image/png");
    });

    it("returns image/jpeg for JPEG magic bytes", () => {
      const header = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
      expect(detector.detectFromBytes(header, "test.jpg")).toBe("image/jpeg");
    });

    it("returns image/webp for valid RIFF+WEBP bytes", () => {
      const header = Buffer.from([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
        0x57, 0x45, 0x42, 0x50,
      ]);
      expect(detector.detectFromBytes(header, "test.webp")).toBe("image/webp");
    });

    it("returns application/pdf for PDF magic bytes", () => {
      const header = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x00, 0x00, 0x00, 0x00]);
      expect(detector.detectFromBytes(header, "test.pdf")).toBe("application/pdf");
    });

    it("throws for empty buffer", () => {
      expect(() => detector.detectFromBytes(Buffer.alloc(0), "empty")).toThrow(
        expect.objectContaining({
          code: FileErrorCode.UNSUPPORTED_TYPE,
          message: expect.stringContaining("empty (0 bytes)"),
        }),
      );
    });

    it("throws for truncated header (less than 4 bytes)", () => {
      const header = Buffer.from([0x89, 0x50]);
      expect(() => detector.detectFromBytes(header, "truncated")).toThrow(
        expect.objectContaining({
          code: FileErrorCode.UNSUPPORTED_TYPE,
          message: expect.stringContaining("too small"),
        }),
      );
    });

    it("throws for exactly 3 bytes", () => {
      const header = Buffer.from([0x89, 0x50, 0x4e]);
      expect(() => detector.detectFromBytes(header, "short")).toThrow(
        expect.objectContaining({
          code: FileErrorCode.UNSUPPORTED_TYPE,
        }),
      );
    });

    it("rejects RIFF header without WEBP marker", () => {
      const header = Buffer.from([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
        0x41, 0x56, 0x49, 0x20, // AVI, not WEBP
      ]);
      expect(() => detector.detectFromBytes(header, "not-webp.avi")).toThrow(
        expect.objectContaining({
          code: FileErrorCode.UNSUPPORTED_TYPE,
        }),
      );
    });

    it("rejects RIFF header with short buffer (no WEBP marker space)", () => {
      const header = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00]);
      expect(() => detector.detectFromBytes(header, "short-riff")).toThrow(
        expect.objectContaining({
          code: FileErrorCode.UNSUPPORTED_TYPE,
        }),
      );
    });

    it("detects correct type regardless of file extension", () => {
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00]);
      expect(detector.detectFromBytes(pngHeader, "misleading.jpg")).toBe("image/png");
    });

    it("preserves filePath in error", () => {
      const header = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
      try {
        detector.detectFromBytes(header, "/path/to/file.xyz");
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(FileProcessorError);
        expect((error as FileProcessorError).filePath).toBe("/path/to/file.xyz");
      }
    });
  });

  describe("validateMimeHint()", () => {
    it("does not throw when hint matches detected type", () => {
      expect(() => {
        detector.validateMimeHint("image/png", "image/png", "test.png");
      }).not.toThrow();
    });

    it("does not throw when hint is undefined", () => {
      expect(() => {
        detector.validateMimeHint("image/png", undefined, "test.png");
      }).not.toThrow();
    });

    it("throws MIME_MISMATCH when hint differs from detected", () => {
      expect(() => {
        detector.validateMimeHint("image/png", "image/jpeg", "test.png");
      }).toThrow(
        expect.objectContaining({
          code: FileErrorCode.MIME_MISMATCH,
          message: expect.stringContaining('expected "image/jpeg" but detected "image/png"'),
        }),
      );
    });

    it("throws MIME_MISMATCH for pdf hint on image", () => {
      expect(() => {
        detector.validateMimeHint("image/webp", "application/pdf", "test.webp");
      }).toThrow(
        expect.objectContaining({
          code: FileErrorCode.MIME_MISMATCH,
        }),
      );
    });
  });

  describe("getCategory()", () => {
    it("returns 'image' for image/png", () => {
      expect(detector.getCategory("image/png")).toBe("image");
    });

    it("returns 'image' for image/jpeg", () => {
      expect(detector.getCategory("image/jpeg")).toBe("image");
    });

    it("returns 'image' for image/webp", () => {
      expect(detector.getCategory("image/webp")).toBe("image");
    });

    it("returns 'pdf' for application/pdf", () => {
      expect(detector.getCategory("application/pdf")).toBe("pdf");
    });
  });

  describe("getMaxSize()", () => {
    it("returns 20 MB for PNG", () => {
      expect(detector.getMaxSize("image/png")).toBe(20 * 1024 * 1024);
    });

    it("returns 20 MB for JPEG", () => {
      expect(detector.getMaxSize("image/jpeg")).toBe(20 * 1024 * 1024);
    });

    it("returns 20 MB for WebP", () => {
      expect(detector.getMaxSize("image/webp")).toBe(20 * 1024 * 1024);
    });

    it("returns 50 MB for PDF", () => {
      expect(detector.getMaxSize("application/pdf")).toBe(50 * 1024 * 1024);
    });
  });
});
