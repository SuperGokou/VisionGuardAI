import type { MagicSignature, SupportedMimeType } from "./types.js";
import { FileErrorCode, FileProcessorError, SUPPORTED_MIME_TYPES } from "./types.js";

/**
 * Magic byte signatures for supported file types.
 * Each signature defines the byte pattern, offset, and corresponding MIME type.
 */
const MAGIC_SIGNATURES: ReadonlyArray<MagicSignature> = [
  {
    bytes: [0x89, 0x50, 0x4e, 0x47],
    offset: 0,
    mimeType: "image/png",
  },
  {
    bytes: [0xff, 0xd8, 0xff],
    offset: 0,
    mimeType: "image/jpeg",
  },
  {
    bytes: [0x52, 0x49, 0x46, 0x46],
    offset: 0,
    mimeType: "image/webp",
  },
  {
    bytes: [0x25, 0x50, 0x44, 0x46],
    offset: 0,
    mimeType: "application/pdf",
  },
];

/**
 * Additional bytes to check for WebP (RIFF header must also contain "WEBP").
 */
const WEBP_MARKER = [0x57, 0x45, 0x42, 0x50]; // "WEBP" at offset 8

/**
 * Number of bytes needed from the file header for MIME detection.
 */
const HEADER_BYTES_NEEDED = 12;

/**
 * Detects MIME type of files using magic byte signatures.
 * Never relies on file extension alone for security.
 */
export class MimeDetector {
  /**
   * Detect the MIME type of a file by reading its magic bytes.
   *
   * @param filePath - Absolute path to the file to inspect.
   * @returns The detected MIME type.
   * @throws FileProcessorError if the type cannot be determined or is unsupported.
   */
  async detect(filePath: string): Promise<SupportedMimeType> {
    const header = await this.readHeader(filePath);
    return this.detectFromBytes(header, filePath);
  }

  /**
   * Detect MIME type from raw header bytes.
   * Exported for testing purposes.
   */
  detectFromBytes(header: Buffer, filePath: string): SupportedMimeType {
    if (header.length === 0) {
      throw new FileProcessorError(
        "File is empty (0 bytes)",
        FileErrorCode.UNSUPPORTED_TYPE,
        filePath,
      );
    }

    if (header.length < 4) {
      throw new FileProcessorError(
        `File is too small to determine type (${header.length} bytes)`,
        FileErrorCode.UNSUPPORTED_TYPE,
        filePath,
      );
    }

    for (const signature of MAGIC_SIGNATURES) {
      if (this.matchesSignature(header, signature)) {
        // WebP needs additional verification: RIFF header + "WEBP" at offset 8
        if (signature.mimeType === "image/webp") {
          if (!this.isValidWebP(header)) {
            continue;
          }
        }
        return signature.mimeType;
      }
    }

    throw new FileProcessorError(
      "File type is not supported. Supported types: PNG, JPEG, WebP, PDF",
      FileErrorCode.UNSUPPORTED_TYPE,
      filePath,
    );
  }

  /**
   * Validate that a detected MIME type matches an expected category.
   *
   * @param detected - The MIME type detected from magic bytes.
   * @param hint - An optional MIME type hint provided by the user.
   * @param filePath - The file path (for error reporting).
   * @throws FileProcessorError if the hint doesn't match the detected type.
   */
  validateMimeHint(
    detected: SupportedMimeType,
    hint: SupportedMimeType | undefined,
    filePath: string,
  ): void {
    if (hint !== undefined && hint !== detected) {
      throw new FileProcessorError(
        `MIME type mismatch: expected "${hint}" but detected "${detected}"`,
        FileErrorCode.MIME_MISMATCH,
        filePath,
      );
    }
  }

  /**
   * Get the file category (image or pdf) from a MIME type.
   */
  getCategory(mimeType: SupportedMimeType): "image" | "pdf" {
    return mimeType === "application/pdf" ? "pdf" : "image";
  }

  /**
   * Get the maximum allowed file size for a given MIME type.
   */
  getMaxSize(mimeType: SupportedMimeType): number {
    return SUPPORTED_MIME_TYPES[mimeType].maxSize;
  }

  private async readHeader(filePath: string): Promise<Buffer> {
    try {
      const fileHandle = await import("node:fs/promises").then((fs) => fs.open(filePath, "r"));
      try {
        const buffer = Buffer.alloc(HEADER_BYTES_NEEDED);
        const { bytesRead } = await fileHandle.read(buffer, 0, HEADER_BYTES_NEEDED, 0);
        return buffer.subarray(0, bytesRead);
      } finally {
        await fileHandle.close();
      }
    } catch (error) {
      if (error instanceof FileProcessorError) {
        throw error;
      }
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === "ENOENT") {
        throw new FileProcessorError(
          `File not found: ${filePath}`,
          FileErrorCode.FILE_NOT_FOUND,
          filePath,
        );
      }
      if (nodeError.code === "EACCES") {
        throw new FileProcessorError(
          `Permission denied: ${filePath}`,
          FileErrorCode.PERMISSION_DENIED,
          filePath,
        );
      }
      throw new FileProcessorError(
        `Failed to read file header: ${nodeError.message}`,
        FileErrorCode.ENCODING_FAILED,
        filePath,
      );
    }
  }

  private matchesSignature(header: Buffer, signature: MagicSignature): boolean {
    for (let i = 0; i < signature.bytes.length; i++) {
      if (header[signature.offset + i] !== signature.bytes[i]) {
        return false;
      }
    }
    return true;
  }

  private isValidWebP(header: Buffer): boolean {
    if (header.length < 12) {
      return false;
    }
    for (let i = 0; i < WEBP_MARKER.length; i++) {
      if (header[8 + i] !== WEBP_MARKER[i]) {
        return false;
      }
    }
    return true;
  }
}
