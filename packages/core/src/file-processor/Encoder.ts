import { open, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import type { SupportedMimeType } from "./types.js";
import { FileErrorCode, FileProcessorError, SUPPORTED_MIME_TYPES } from "./types.js";

/**
 * Maximum buffer size for file processing (256 MB).
 */
const MAX_BUFFER_SIZE = 256 * 1024 * 1024;

/**
 * Chunk size for streaming reads (64 KB).
 */
const STREAM_CHUNK_SIZE = 64 * 1024;

/**
 * Encodes files to base64 for the Gemini API inline_data format.
 * Supports both buffered and streaming reads with size limit enforcement.
 */
export class Encoder {
  /**
   * Encode a file to base64 string.
   *
   * For files under the stream threshold, reads the entire file into memory.
   * For larger files, uses streaming to avoid excessive memory usage.
   *
   * @param filePath - Absolute path to the file.
   * @param mimeType - The verified MIME type of the file.
   * @param maxSizeOverride - Optional size limit override.
   * @returns Base64-encoded file content.
   */
  async encode(
    filePath: string,
    mimeType: SupportedMimeType,
    maxSizeOverride?: number,
  ): Promise<string> {
    const fileSize = await this.getFileSize(filePath);
    const maxSize = maxSizeOverride ?? SUPPORTED_MIME_TYPES[mimeType].maxSize;

    this.validateSize(filePath, fileSize, maxSize);
    this.validateBufferLimit(filePath, fileSize);

    if (fileSize > STREAM_CHUNK_SIZE * 16) {
      return this.encodeStreaming(filePath, fileSize);
    }

    return this.encodeBuffered(filePath);
  }

  /**
   * Encode a portion of a file (used for PDF page chunking).
   * Reads bytes from startOffset to endOffset and returns base64.
   */
  async encodeRange(
    filePath: string,
    startOffset: number,
    length: number,
  ): Promise<string> {
    const fileHandle = await open(filePath, "r");
    try {
      const buffer = Buffer.alloc(length);
      const { bytesRead } = await fileHandle.read(buffer, 0, length, startOffset);
      return buffer.subarray(0, bytesRead).toString("base64");
    } finally {
      await fileHandle.close();
    }
  }

  /**
   * Get the size of a file in bytes.
   */
  async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await stat(filePath);
      return stats.size;
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === "ENOENT") {
        throw new FileProcessorError(
          `File not found: ${filePath}`,
          FileErrorCode.FILE_NOT_FOUND,
          filePath,
        );
      }
      throw new FileProcessorError(
        `Failed to read file stats: ${nodeError.message}`,
        FileErrorCode.ENCODING_FAILED,
        filePath,
      );
    }
  }

  private validateSize(filePath: string, fileSize: number, maxSize: number): void {
    if (fileSize > maxSize) {
      const maxMB = (maxSize / (1024 * 1024)).toFixed(1);
      const fileMB = (fileSize / (1024 * 1024)).toFixed(1);
      throw new FileProcessorError(
        `File too large: ${fileMB} MB exceeds maximum of ${maxMB} MB`,
        FileErrorCode.FILE_TOO_LARGE,
        filePath,
      );
    }
  }

  private validateBufferLimit(filePath: string, fileSize: number): void {
    if (fileSize > MAX_BUFFER_SIZE) {
      throw new FileProcessorError(
        `File exceeds processing buffer limit of ${MAX_BUFFER_SIZE / (1024 * 1024)} MB`,
        FileErrorCode.FILE_TOO_LARGE,
        filePath,
      );
    }
  }

  private async encodeBuffered(filePath: string): Promise<string> {
    const fileHandle = await open(filePath, "r");
    try {
      const buffer = await fileHandle.readFile();
      return buffer.toString("base64");
    } catch (error) {
      if (error instanceof FileProcessorError) {
        throw error;
      }
      throw new FileProcessorError(
        `Failed to encode file: ${(error as Error).message}`,
        FileErrorCode.ENCODING_FAILED,
        filePath,
      );
    } finally {
      await fileHandle.close();
    }
  }

  private async encodeStreaming(filePath: string, expectedSize: number): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      let totalBytes = 0;

      const stream = createReadStream(filePath, {
        highWaterMark: STREAM_CHUNK_SIZE,
      });

      stream.on("data", (chunk: string | Buffer) => {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        totalBytes += buf.length;
        if (totalBytes > MAX_BUFFER_SIZE) {
          stream.destroy();
          reject(
            new FileProcessorError(
              `File exceeded buffer limit during streaming`,
              FileErrorCode.FILE_TOO_LARGE,
              filePath,
            ),
          );
          return;
        }
        chunks.push(buf);
      });

      stream.on("end", () => {
        const fullBuffer = Buffer.concat(chunks, totalBytes);
        resolve(fullBuffer.toString("base64"));
      });

      stream.on("error", (error) => {
        reject(
          new FileProcessorError(
            `Streaming encode failed: ${error.message}`,
            FileErrorCode.ENCODING_FAILED,
            filePath,
          ),
        );
      });
    });
  }
}
