import { describe, it, expect } from "vitest";
import { MultiPartBuilder } from "./MultiPartBuilder.js";
import type { ProcessedFile } from "../file-processor/types.js";

function createMockFile(overrides: Partial<ProcessedFile> = {}): ProcessedFile {
  return {
    originalPath: "/test/image.png",
    resolvedPath: "/test/image.png",
    mimeType: "image/png",
    category: "image",
    sizeBytes: 1024,
    encodedData: Buffer.from("fake-image-data").toString("base64"),
    ...overrides,
  };
}

describe("MultiPartBuilder", () => {
  const builder = new MultiPartBuilder();

  describe("build", () => {
    it("builds content with text and a single image file", () => {
      const file = createMockFile();
      const content = builder.build("Describe this image", [file]);

      expect(content.parts).toHaveLength(2);
      // File comes first
      expect(content.parts[0]).toHaveProperty("inlineData");
      // Text comes after
      expect(content.parts[1]).toHaveProperty("text", "Describe this image");
    });

    it("creates correct inline_data format for Gemini API", () => {
      const file = createMockFile({ mimeType: "image/jpeg" });
      const content = builder.build("prompt", [file]);

      const inlinePart = content.parts[0];
      expect(inlinePart).toHaveProperty("inlineData");
      if ("inlineData" in inlinePart) {
        expect(inlinePart.inlineData.mimeType).toBe("image/jpeg");
        expect(typeof inlinePart.inlineData.data).toBe("string");
      }
    });

    it("builds content with multiple files", () => {
      const files = [
        createMockFile({ originalPath: "/test/a.png" }),
        createMockFile({ originalPath: "/test/b.jpg", mimeType: "image/jpeg" }),
      ];
      const content = builder.build("Compare", files);

      // 2 files + 1 text = 3 parts
      expect(content.parts).toHaveLength(3);
    });

    it("handles chunked PDF files", () => {
      const file = createMockFile({
        mimeType: "application/pdf",
        category: "pdf",
        chunks: [
          {
            index: 0,
            totalChunks: 2,
            encodedData: "chunk0data",
            pageRange: { start: 1, end: 5 },
          },
          {
            index: 1,
            totalChunks: 2,
            encodedData: "chunk1data",
            pageRange: { start: 6, end: 10 },
          },
        ],
      });

      const content = builder.build("Analyze", [file]);
      // Each chunk gets a text label + inline data = 2 per chunk + 1 prompt text
      expect(content.parts).toHaveLength(5);
    });

    it("omits text part when prompt is empty", () => {
      const file = createMockFile();
      const content = builder.build("", [file]);

      expect(content.parts).toHaveLength(1);
      expect(content.parts[0]).toHaveProperty("inlineData");
    });

    it("builds empty parts when no files and empty prompt", () => {
      const content = builder.build("", []);
      expect(content.parts).toHaveLength(0);
    });

    it("places text prompt after all file parts", () => {
      const files = [
        createMockFile({ originalPath: "/a.png" }),
        createMockFile({ originalPath: "/b.png" }),
      ];
      const content = builder.build("My prompt", files);
      const lastPart = content.parts[content.parts.length - 1];
      expect(lastPart).toHaveProperty("text", "My prompt");
    });
  });

  describe("buildTextOnly", () => {
    it("builds content with only text", () => {
      const content = builder.buildTextOnly("Hello");
      expect(content.parts).toHaveLength(1);
      expect(content.parts[0]).toHaveProperty("text", "Hello");
    });
  });

  describe("buildFilesOnly", () => {
    it("builds content with only files", () => {
      const files = [createMockFile()];
      const content = builder.buildFilesOnly(files);
      expect(content.parts).toHaveLength(1);
      expect(content.parts[0]).toHaveProperty("inlineData");
    });
  });

  describe("estimatePayloadSize", () => {
    it("estimates size for text parts", () => {
      const content = builder.buildTextOnly("Hello World");
      const size = builder.estimatePayloadSize(content);
      expect(size).toBe(Buffer.byteLength("Hello World", "utf8"));
    });

    it("estimates size for file parts", () => {
      const file = createMockFile({ encodedData: "AAAA" });
      const content = builder.buildFilesOnly([file]);
      const size = builder.estimatePayloadSize(content);
      expect(size).toBe(4); // length of "AAAA"
    });

    it("sums text and file sizes", () => {
      const file = createMockFile({ encodedData: "AAAA" });
      const content = builder.build("Hi", [file]);
      const size = builder.estimatePayloadSize(content);
      expect(size).toBe(4 + Buffer.byteLength("Hi", "utf8"));
    });
  });

  describe("estimateTokenCount", () => {
    it("estimates tokens for text content", () => {
      const content = builder.buildTextOnly("Hello World!"); // 12 chars
      const tokens = builder.estimateTokenCount(content);
      expect(tokens).toBe(Math.ceil(12 / 4)); // 3
    });

    it("estimates tokens for image content", () => {
      // 1KB of base64 data = ~768 raw bytes = ~1 * 258 tokens
      const data = "A".repeat(1024);
      const file = createMockFile({ encodedData: data });
      const content = builder.buildFilesOnly([file]);
      const tokens = builder.estimateTokenCount(content);
      expect(tokens).toBeGreaterThan(0);
    });

    it("combines text and file token estimates", () => {
      const file = createMockFile({ encodedData: "AA" });
      const content = builder.build("Hello", [file]);
      const tokens = builder.estimateTokenCount(content);
      // At minimum, there should be text tokens
      expect(tokens).toBeGreaterThanOrEqual(Math.ceil(5 / 4));
    });
  });

  describe("countParts", () => {
    it("counts text and file parts separately", () => {
      const file = createMockFile();
      const content = builder.build("prompt", [file]);
      const counts = builder.countParts(content);
      expect(counts.text).toBe(1);
      expect(counts.file).toBe(1);
      expect(counts.total).toBe(2);
    });

    it("counts zero for empty content", () => {
      const content = builder.build("", []);
      const counts = builder.countParts(content);
      expect(counts.text).toBe(0);
      expect(counts.file).toBe(0);
      expect(counts.total).toBe(0);
    });

    it("counts multiple files correctly", () => {
      const files = [createMockFile(), createMockFile(), createMockFile()];
      const content = builder.build("prompt", files);
      const counts = builder.countParts(content);
      expect(counts.file).toBe(3);
      expect(counts.text).toBe(1);
      expect(counts.total).toBe(4);
    });
  });
});
