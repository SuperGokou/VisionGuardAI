import { readFile } from "node:fs/promises";
import type { EncodedChunk, PageRange } from "./types.js";
import { FileErrorCode, FileProcessorError } from "./types.js";

/**
 * Default number of pages per chunk when splitting PDFs.
 */
const DEFAULT_PAGES_PER_CHUNK = 5;

/**
 * PDF end-of-file marker.
 */
const PDF_EOF_MARKER = Buffer.from("%%EOF");

/**
 * PDF page tree object pattern (simplified detection).
 * Looks for "/Type /Page" entries in the PDF structure.
 */
const PAGE_MARKER = Buffer.from("/Type /Page");
const PAGE_TREE_MARKER = Buffer.from("/Type /Pages");

/**
 * Splits PDF files into page-based chunks for processing.
 * Uses structural PDF markers to identify page boundaries.
 */
export class Chunker {
  private readonly pagesPerChunk: number;

  constructor(pagesPerChunk: number = DEFAULT_PAGES_PER_CHUNK) {
    if (pagesPerChunk < 1) {
      throw new Error("Pages per chunk must be at least 1");
    }
    this.pagesPerChunk = pagesPerChunk;
  }

  /**
   * Count the number of pages in a PDF file.
   * Uses the /Type /Page markers to count individual pages.
   *
   * @param filePath - Path to the PDF file.
   * @returns The number of pages detected.
   */
  async countPages(filePath: string): Promise<number> {
    const buffer = await this.readPdfBuffer(filePath);
    return this.countPageMarkers(buffer);
  }

  /**
   * Split a PDF file's base64 content into chunks by page ranges.
   *
   * For simplicity and reliability, this creates logical chunks based on
   * byte ranges that approximately correspond to page boundaries.
   * Each chunk is independently base64-encoded.
   *
   * @param filePath - Path to the PDF file.
   * @param encodedData - The full base64-encoded PDF data.
   * @returns Array of encoded chunks with page range metadata.
   */
  async chunk(filePath: string, encodedData: string): Promise<ReadonlyArray<EncodedChunk>> {
    const buffer = await this.readPdfBuffer(filePath);
    const pageOffsets = this.findPageOffsets(buffer);
    const totalPages = pageOffsets.length;

    if (totalPages === 0) {
      // If we can't detect pages, return the whole file as one chunk
      return [
        {
          index: 0,
          totalChunks: 1,
          encodedData,
          pageRange: { start: 1, end: 1 },
        },
      ];
    }

    if (totalPages <= this.pagesPerChunk) {
      return [
        {
          index: 0,
          totalChunks: 1,
          encodedData,
          pageRange: { start: 1, end: totalPages },
        },
      ];
    }

    const chunks: EncodedChunk[] = [];
    const totalChunks = Math.ceil(totalPages / this.pagesPerChunk);

    for (let i = 0; i < totalChunks; i++) {
      const startPage = i * this.pagesPerChunk;
      const endPage = Math.min(startPage + this.pagesPerChunk, totalPages);

      const startOffset = pageOffsets[startPage];
      const endOffset =
        endPage < totalPages ? pageOffsets[endPage] : buffer.length;

      const chunkBuffer = buffer.subarray(startOffset, endOffset);
      const chunkEncoded = chunkBuffer.toString("base64");

      chunks.push({
        index: i,
        totalChunks,
        encodedData: chunkEncoded,
        pageRange: {
          start: startPage + 1,
          end: endPage,
        },
      });
    }

    return chunks;
  }

  /**
   * Calculate page ranges for a given total page count.
   * Useful for planning without reading the actual file.
   */
  calculatePageRanges(totalPages: number): ReadonlyArray<PageRange> {
    const ranges: PageRange[] = [];
    const totalChunks = Math.ceil(totalPages / this.pagesPerChunk);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * this.pagesPerChunk + 1;
      const end = Math.min(start + this.pagesPerChunk - 1, totalPages);
      ranges.push({ start, end });
    }

    return ranges;
  }

  private async readPdfBuffer(filePath: string): Promise<Buffer> {
    try {
      return await readFile(filePath);
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      throw new FileProcessorError(
        `Failed to read PDF file: ${nodeError.message}`,
        FileErrorCode.ENCODING_FAILED,
        filePath,
      );
    }
  }

  private countPageMarkers(buffer: Buffer): number {
    let count = 0;
    let offset = 0;

    while (offset < buffer.length) {
      const index = buffer.indexOf(PAGE_MARKER, offset);
      if (index === -1) break;

      // Make sure this is /Type /Page and not /Type /Pages
      const afterMarker = index + PAGE_MARKER.length;
      if (afterMarker < buffer.length && buffer[afterMarker] === 0x73) {
        // 0x73 = 's', so this is "/Type /Pages" - skip it
        offset = afterMarker + 1;
        continue;
      }

      count++;
      offset = afterMarker;
    }

    return count;
  }

  private findPageOffsets(buffer: Buffer): ReadonlyArray<number> {
    const offsets: number[] = [];
    let offset = 0;

    while (offset < buffer.length) {
      const index = buffer.indexOf(PAGE_MARKER, offset);
      if (index === -1) break;

      const afterMarker = index + PAGE_MARKER.length;
      if (afterMarker < buffer.length && buffer[afterMarker] === 0x73) {
        offset = afterMarker + 1;
        continue;
      }

      // Walk backwards to find the start of the object containing this page marker
      const objectStart = this.findObjectStart(buffer, index);
      offsets.push(objectStart);
      offset = afterMarker;
    }

    return offsets;
  }

  private findObjectStart(buffer: Buffer, markerOffset: number): number {
    // Look backwards for "N 0 obj" pattern which starts a PDF object
    const searchStart = Math.max(0, markerOffset - 200);
    const searchSlice = buffer.subarray(searchStart, markerOffset);
    const objMarker = Buffer.from(" 0 obj");
    const objIndex = searchSlice.lastIndexOf(objMarker);

    if (objIndex !== -1) {
      // Find the start of the line containing "N 0 obj"
      let lineStart = objIndex;
      while (lineStart > 0 && searchSlice[lineStart - 1] !== 0x0a && searchSlice[lineStart - 1] !== 0x0d) {
        lineStart--;
      }
      return searchStart + lineStart;
    }

    return markerOffset;
  }
}
