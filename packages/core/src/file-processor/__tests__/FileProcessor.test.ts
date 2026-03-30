import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { writeFileSync, mkdirSync, unlinkSync, rmdirSync } from "node:fs";
import { FileProcessor } from "../FileProcessor.js";
import { FileErrorCode, FileProcessorError } from "../types.js";

const FIXTURES = join(__dirname, "..", "__fixtures__");

describe("FileProcessor", () => {
  describe("constructor", () => {
    it("creates with default config", () => {
      const processor = new FileProcessor();
      expect(processor).toBeDefined();
    });

    it("creates with custom config", () => {
      const processor = new FileProcessor({
        allowedDirectories: [FIXTURES],
        pdfChunkPages: 3,
      });
      expect(processor).toBeDefined();
    });
  });

  describe("process()", () => {
    it("processes a PNG file end-to-end", async () => {
      const processor = new FileProcessor({
        allowedDirectories: [FIXTURES],
      });

      const result = await processor.process({
        path: join(FIXTURES, "test-image.png"),
      });

      expect(result.mimeType).toBe("image/png");
      expect(result.category).toBe("image");
      expect(result.sizeBytes).toBeGreaterThan(0);
      expect(result.encodedData).toBeTruthy();
      expect(result.originalPath).toContain("test-image.png");
      expect(result.resolvedPath).toContain("test-image.png");
      expect(result.chunks).toBeUndefined();
    });

    it("processes a JPEG file end-to-end", async () => {
      const processor = new FileProcessor({
        allowedDirectories: [FIXTURES],
      });

      const result = await processor.process({
        path: join(FIXTURES, "test-image.jpg"),
      });

      expect(result.mimeType).toBe("image/jpeg");
      expect(result.category).toBe("image");
      expect(result.sizeBytes).toBeGreaterThan(0);
      expect(result.chunks).toBeUndefined();
    });

    it("processes a WebP file end-to-end", async () => {
      const processor = new FileProcessor({
        allowedDirectories: [FIXTURES],
      });

      const result = await processor.process({
        path: join(FIXTURES, "test-image.webp"),
      });

      expect(result.mimeType).toBe("image/webp");
      expect(result.category).toBe("image");
      expect(result.sizeBytes).toBeGreaterThan(0);
      expect(result.chunks).toBeUndefined();
    });

    it("processes a PDF file and produces chunks", async () => {
      const processor = new FileProcessor({
        allowedDirectories: [FIXTURES],
        pdfChunkPages: 1,
      });

      const result = await processor.process({
        path: join(FIXTURES, "test-document.pdf"),
      });

      expect(result.mimeType).toBe("application/pdf");
      expect(result.category).toBe("pdf");
      expect(result.sizeBytes).toBeGreaterThan(0);
      expect(result.encodedData).toBeTruthy();
      expect(result.chunks).toBeDefined();
      if (result.chunks) {
        expect(result.chunks.length).toBeGreaterThanOrEqual(1);
      }
    });

    it("validates MIME hint correctly", async () => {
      const processor = new FileProcessor({
        allowedDirectories: [FIXTURES],
      });

      const result = await processor.process({
        path: join(FIXTURES, "test-image.png"),
        mimeTypeHint: "image/png",
      });
      expect(result.mimeType).toBe("image/png");
    });

    it("throws MIME_MISMATCH for wrong hint", async () => {
      const processor = new FileProcessor({
        allowedDirectories: [FIXTURES],
      });

      await expect(
        processor.process({
          path: join(FIXTURES, "test-image.png"),
          mimeTypeHint: "image/jpeg",
        }),
      ).rejects.toThrow(
        expect.objectContaining({
          code: FileErrorCode.MIME_MISMATCH,
        }),
      );
    });

    it("throws FILE_NOT_FOUND for missing file", async () => {
      const processor = new FileProcessor({
        allowedDirectories: [FIXTURES],
      });

      await expect(
        processor.process({ path: join(FIXTURES, "nonexistent.png") }),
      ).rejects.toThrow(
        expect.objectContaining({
          code: FileErrorCode.FILE_NOT_FOUND,
        }),
      );
    });

    it("throws SANDBOX_VIOLATION for path outside allowed dirs", async () => {
      const subDir = join(FIXTURES, "_temp_sandbox_test");
      mkdirSync(subDir, { recursive: true });
      writeFileSync(join(subDir, "allowed.txt"), "ok");

      const processor = new FileProcessor({
        allowedDirectories: [subDir],
      });

      await expect(
        processor.process({ path: join(FIXTURES, "test-image.png") }),
      ).rejects.toThrow(
        expect.objectContaining({
          code: FileErrorCode.SANDBOX_VIOLATION,
        }),
      );

      unlinkSync(join(subDir, "allowed.txt"));
      rmdirSync(subDir);
    });

    it("throws UNSUPPORTED_TYPE for unknown file type", async () => {
      const processor = new FileProcessor({
        allowedDirectories: [FIXTURES],
      });

      await expect(
        processor.process({ path: join(FIXTURES, "unknown-type.bin") }),
      ).rejects.toThrow(
        expect.objectContaining({
          code: FileErrorCode.UNSUPPORTED_TYPE,
        }),
      );
    });

    it("respects maxFileSizeOverride per MIME type", async () => {
      const processor = new FileProcessor({
        allowedDirectories: [FIXTURES],
        maxFileSizeOverride: { "image/png": 1 },
      });

      await expect(
        processor.process({ path: join(FIXTURES, "test-image.png") }),
      ).rejects.toThrow(
        expect.objectContaining({
          code: FileErrorCode.FILE_TOO_LARGE,
        }),
      );
    });
  });

  describe("processMany()", () => {
    it("processes multiple files in parallel", async () => {
      const processor = new FileProcessor({
        allowedDirectories: [FIXTURES],
      });

      const results = await processor.processMany([
        { path: join(FIXTURES, "test-image.png") },
        { path: join(FIXTURES, "test-image.jpg") },
        { path: join(FIXTURES, "test-document.pdf") },
      ]);

      expect(results).toHaveLength(3);
      expect(results[0].mimeType).toBe("image/png");
      expect(results[1].mimeType).toBe("image/jpeg");
      expect(results[2].mimeType).toBe("application/pdf");
    });

    it("propagates errors from individual files", async () => {
      const processor = new FileProcessor({
        allowedDirectories: [FIXTURES],
      });

      await expect(
        processor.processMany([
          { path: join(FIXTURES, "test-image.png") },
          { path: join(FIXTURES, "nonexistent.png") },
        ]),
      ).rejects.toThrow(FileProcessorError);
    });

    it("handles empty input array", async () => {
      const processor = new FileProcessor({
        allowedDirectories: [FIXTURES],
      });

      const results = await processor.processMany([]);
      expect(results).toEqual([]);
    });
  });

  describe("fromPath() static method", () => {
    it("processes a file with config", async () => {
      const result = await FileProcessor.fromPath(
        join(FIXTURES, "test-image.png"),
        { allowedDirectories: [FIXTURES] },
      );

      expect(result.mimeType).toBe("image/png");
      expect(result.category).toBe("image");
      expect(result.encodedData).toBeTruthy();
    });

    it("processes a PDF with custom config", async () => {
      const result = await FileProcessor.fromPath(
        join(FIXTURES, "test-document.pdf"),
        { allowedDirectories: [FIXTURES], pdfChunkPages: 1 },
      );

      expect(result.mimeType).toBe("application/pdf");
      expect(result.chunks).toBeDefined();
    });

    it("throws for missing file", async () => {
      await expect(
        FileProcessor.fromPath(join(FIXTURES, "nope.png"), {
          allowedDirectories: [FIXTURES],
        }),
      ).rejects.toThrow(FileProcessorError);
    });
  });

  describe("integration: full pipeline correctness", () => {
    it("PNG roundtrip preserves content", async () => {
      const processor = new FileProcessor({
        allowedDirectories: [FIXTURES],
      });

      const result = await processor.process({
        path: join(FIXTURES, "test-image.png"),
      });

      const decoded = Buffer.from(result.encodedData, "base64");
      expect(decoded[0]).toBe(0x89);
      expect(decoded[1]).toBe(0x50);
      expect(decoded[2]).toBe(0x4e);
      expect(decoded[3]).toBe(0x47);
    });

    it("PDF processing includes correct metadata", async () => {
      const processor = new FileProcessor({
        allowedDirectories: [FIXTURES],
      });

      const result = await processor.process({
        path: join(FIXTURES, "test-document.pdf"),
      });

      expect(result.category).toBe("pdf");
      expect(result.mimeType).toBe("application/pdf");
      expect(result.sizeBytes).toBe(
        Buffer.from(result.encodedData, "base64").length,
      );
    });

    it("all image types produce identical structure", async () => {
      const processor = new FileProcessor({
        allowedDirectories: [FIXTURES],
      });

      const png = await processor.process({ path: join(FIXTURES, "test-image.png") });
      const jpg = await processor.process({ path: join(FIXTURES, "test-image.jpg") });
      const webp = await processor.process({ path: join(FIXTURES, "test-image.webp") });

      for (const result of [png, jpg, webp]) {
        expect(result.category).toBe("image");
        expect(result.chunks).toBeUndefined();
        expect(result.sizeBytes).toBeGreaterThan(0);
        expect(result.encodedData).toBeTruthy();
        expect(result.resolvedPath).toBeTruthy();
        expect(result.originalPath).toBeTruthy();
      }
    });
  });
});
