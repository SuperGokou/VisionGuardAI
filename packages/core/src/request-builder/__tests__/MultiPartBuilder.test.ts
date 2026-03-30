import { describe, it, expect, beforeEach } from "vitest";
import { MultiPartBuilder } from "../MultiPartBuilder.js";
import type { ProcessedFile, EncodedChunk } from "../../file-processor/types.js";

function createMockProcessedFile(overrides?: Partial<ProcessedFile>): ProcessedFile {
  return {
    originalPath: "/test/image.png",
    resolvedPath: "/test/image.png",
    mimeType: "image/png",
    category: "image",
    sizeBytes: 1024,
    encodedData: "aGVsbG8=", // "hello" in base64
    ...overrides,
  };
}

function createMockChunkedPdf(): ProcessedFile {
  const chunks: EncodedChunk[] = [
    {
      index: 0,
      totalChunks: 2,
      encodedData: "Y2h1bmsx", // "chunk1"
      pageRange: { start: 1, end: 5 },
    },
    {
      index: 1,
      totalChunks: 2,
      encodedData: "Y2h1bmsY", // "chunk2"
      pageRange: { start: 6, end: 10 },
    },
  ];

  return {
    originalPath: "/test/doc.pdf",
    resolvedPath: "/test/doc.pdf",
    mimeType: "application/pdf",
    category: "pdf",
    sizeBytes: 50000,
    encodedData: "ZnVsbHBkZg==", // full PDF data
    chunks,
  };
}

describe("MultiPartBuilder", () => {
  let builder: MultiPartBuilder;

  beforeEach(() => {
    builder = new MultiPartBuilder();
  });

  describe("build", () => {
    it("should create content with file and text parts", () => {
      const file = createMockProcessedFile();
      const content = builder.build("Describe this image", [file]);

      expect(content.parts).toHaveLength(2);
      // First part: file data
      expect(content.parts[0]).toHaveProperty("inlineData");
      // Second part: text
      expect(content.parts[1]).toHaveProperty("text", "Describe this image");
    });

    it("should handle multiple files", () => {
      const files = [
        createMockProcessedFile({ originalPath: "/a.png" }),
        createMockProcessedFile({ originalPath: "/b.jpg", mimeType: "image/jpeg" }),
      ];
      const content = builder.build("Compare these", files);

      // 2 file parts + 1 text part
      expect(content.parts).toHaveLength(3);
    });

    it("should expand chunked PDFs into multiple parts", () => {
      const pdf = createMockChunkedPdf();
      const content = builder.build("Analyze this document", [pdf]);

      // 2 chunks * 2 (text label + data) + 1 prompt = 5 parts
      expect(content.parts).toHaveLength(5);

      // First pair: label + data
      expect(content.parts[0]).toHaveProperty("text");
      expect((content.parts[0] as { text: string }).text).toContain("Pages 1-5");
      expect(content.parts[1]).toHaveProperty("inlineData");
    });

    it("should omit text part when prompt is empty", () => {
      const file = createMockProcessedFile();
      const content = builder.build("", [file]);

      expect(content.parts).toHaveLength(1);
      expect(content.parts[0]).toHaveProperty("inlineData");
    });

    it("should handle single-chunk PDFs without expansion", () => {
      const pdf = createMockProcessedFile({
        mimeType: "application/pdf",
        category: "pdf",
        chunks: [
          {
            index: 0,
            totalChunks: 1,
            encodedData: "c2luZ2xl",
            pageRange: { start: 1, end: 3 },
          },
        ],
      });

      const content = builder.build("Read this", [pdf]);
      // Single chunk PDF uses encodedData directly (1 inline part + 1 text)
      expect(content.parts).toHaveLength(2);
    });
  });

  describe("buildTextOnly", () => {
    it("should create content with only a text part", () => {
      const content = builder.buildTextOnly("Hello world");

      expect(content.parts).toHaveLength(1);
      expect(content.parts[0]).toEqual({ text: "Hello world" });
    });
  });

  describe("buildFilesOnly", () => {
    it("should create content with only file parts", () => {
      const file = createMockProcessedFile();
      const content = builder.buildFilesOnly([file]);

      expect(content.parts).toHaveLength(1);
      expect(content.parts[0]).toHaveProperty("inlineData");
    });
  });

  describe("estimatePayloadSize", () => {
    it("should estimate the payload size in bytes", () => {
      const file = createMockProcessedFile();
      const content = builder.build("Hello", [file]);

      const size = builder.estimatePayloadSize(content);
      expect(size).toBeGreaterThan(0);
      // "Hello" = 5 bytes + "aGVsbG8=" = 8 bytes
      expect(size).toBe(13);
    });
  });
});
