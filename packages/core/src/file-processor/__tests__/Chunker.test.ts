import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { Chunker } from "../Chunker.js";

const FIXTURES = join(__dirname, "..", "__fixtures__");

describe("Chunker", () => {
  describe("constructor", () => {
    it("creates instance with default pages per chunk", () => {
      const chunker = new Chunker();
      // Verify it can be used
      expect(chunker.calculatePageRanges(10)).toHaveLength(2);
    });

    it("creates instance with custom pages per chunk", () => {
      const chunker = new Chunker(2);
      expect(chunker.calculatePageRanges(10)).toHaveLength(5);
    });

    it("throws for pages per chunk less than 1", () => {
      expect(() => new Chunker(0)).toThrow("at least 1");
      expect(() => new Chunker(-1)).toThrow("at least 1");
    });
  });

  describe("countPages()", () => {
    it("counts 2 pages in test PDF", async () => {
      const count = await new Chunker().countPages(join(FIXTURES, "test-document.pdf"));
      expect(count).toBe(2);
    });

    it("throws for non-existent file", async () => {
      await expect(
        new Chunker().countPages(join(FIXTURES, "nonexistent.pdf")),
      ).rejects.toThrow();
    });
  });

  describe("chunk()", () => {
    it("returns single chunk for small PDF (fewer pages than chunk size)", async () => {
      const chunker = new Chunker(5);
      const filePath = join(FIXTURES, "test-document.pdf");
      const encodedData = readFileSync(filePath).toString("base64");

      const chunks = await chunker.chunk(filePath, encodedData);
      expect(chunks).toHaveLength(1);
      expect(chunks[0].index).toBe(0);
      expect(chunks[0].totalChunks).toBe(1);
      expect(chunks[0].pageRange.start).toBe(1);
      expect(chunks[0].pageRange.end).toBe(2);
    });

    it("splits into multiple chunks when pages exceed chunk size", async () => {
      const chunker = new Chunker(1); // 1 page per chunk
      const filePath = join(FIXTURES, "test-document.pdf");
      const encodedData = readFileSync(filePath).toString("base64");

      const chunks = await chunker.chunk(filePath, encodedData);
      expect(chunks.length).toBe(2);
      expect(chunks[0].index).toBe(0);
      expect(chunks[0].totalChunks).toBe(2);
      expect(chunks[0].pageRange).toEqual({ start: 1, end: 1 });
      expect(chunks[1].index).toBe(1);
      expect(chunks[1].totalChunks).toBe(2);
      expect(chunks[1].pageRange).toEqual({ start: 2, end: 2 });
    });

    it("each chunk has valid base64 encoded data", async () => {
      const chunker = new Chunker(1);
      const filePath = join(FIXTURES, "test-document.pdf");
      const encodedData = readFileSync(filePath).toString("base64");

      const chunks = await chunker.chunk(filePath, encodedData);
      for (const chunk of chunks) {
        expect(chunk.encodedData).toMatch(/^[A-Za-z0-9+/]+=*$/);
        expect(chunk.encodedData.length).toBeGreaterThan(0);
      }
    });

    it("handles file with no detectable page markers", async () => {
      // Use the corrupted PNG fixture (not a valid PDF)
      const chunker = new Chunker(5);
      const filePath = join(FIXTURES, "corrupted.png");
      const encodedData = readFileSync(filePath).toString("base64");

      const chunks = await chunker.chunk(filePath, encodedData);
      expect(chunks).toHaveLength(1);
      expect(chunks[0].totalChunks).toBe(1);
      expect(chunks[0].encodedData).toBe(encodedData);
    });
  });

  describe("calculatePageRanges()", () => {
    it("returns single range when pages fit in one chunk", () => {
      const chunker = new Chunker(5);
      const ranges = chunker.calculatePageRanges(3);
      expect(ranges).toEqual([{ start: 1, end: 3 }]);
    });

    it("splits correctly with exact division", () => {
      const chunker = new Chunker(5);
      const ranges = chunker.calculatePageRanges(10);
      expect(ranges).toEqual([
        { start: 1, end: 5 },
        { start: 6, end: 10 },
      ]);
    });

    it("splits correctly with remainder", () => {
      const chunker = new Chunker(3);
      const ranges = chunker.calculatePageRanges(7);
      expect(ranges).toEqual([
        { start: 1, end: 3 },
        { start: 4, end: 6 },
        { start: 7, end: 7 },
      ]);
    });

    it("returns single page range for 1 page", () => {
      const chunker = new Chunker(5);
      const ranges = chunker.calculatePageRanges(1);
      expect(ranges).toEqual([{ start: 1, end: 1 }]);
    });

    it("returns one range per page when chunk size is 1", () => {
      const chunker = new Chunker(1);
      const ranges = chunker.calculatePageRanges(3);
      expect(ranges).toHaveLength(3);
      expect(ranges[0]).toEqual({ start: 1, end: 1 });
      expect(ranges[1]).toEqual({ start: 2, end: 2 });
      expect(ranges[2]).toEqual({ start: 3, end: 3 });
    });

    it("returns empty for 0 pages", () => {
      const chunker = new Chunker(5);
      const ranges = chunker.calculatePageRanges(0);
      expect(ranges).toEqual([]);
    });
  });
});
