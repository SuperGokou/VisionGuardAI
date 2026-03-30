/**
 * Supported MIME types for file processing.
 */
export const SUPPORTED_MIME_TYPES = {
  "image/png": { extensions: [".png"], maxSize: 20 * 1024 * 1024 },
  "image/jpeg": { extensions: [".jpg", ".jpeg"], maxSize: 20 * 1024 * 1024 },
  "image/webp": { extensions: [".webp"], maxSize: 20 * 1024 * 1024 },
  "application/pdf": { extensions: [".pdf"], maxSize: 50 * 1024 * 1024 },
} as const;

export type SupportedMimeType = keyof typeof SUPPORTED_MIME_TYPES;

/**
 * Category of file based on MIME type.
 */
export type FileCategory = "image" | "pdf";

/**
 * Input to the file processor - what the user provides.
 */
export interface FileInput {
  readonly path: string;
  readonly mimeTypeHint?: SupportedMimeType;
}

/**
 * Result after processing a file - ready for API submission.
 */
export interface ProcessedFile {
  readonly originalPath: string;
  readonly resolvedPath: string;
  readonly mimeType: SupportedMimeType;
  readonly category: FileCategory;
  readonly sizeBytes: number;
  readonly encodedData: string;
  readonly chunks?: ReadonlyArray<EncodedChunk>;
}

/**
 * A single chunk of an encoded file (used for PDF page splitting).
 */
export interface EncodedChunk {
  readonly index: number;
  readonly totalChunks: number;
  readonly encodedData: string;
  readonly pageRange: PageRange;
}

/**
 * Page range for PDF chunking.
 */
export interface PageRange {
  readonly start: number;
  readonly end: number;
}

/**
 * Configuration for the FileProcessor.
 */
export interface FileProcessorConfig {
  readonly allowedDirectories: ReadonlyArray<string>;
  readonly maxFileSizeOverride?: Partial<Record<SupportedMimeType, number>>;
  readonly pdfChunkPages?: number;
  readonly enableStreaming?: boolean;
}

/**
 * Error codes for file processing failures.
 */
export enum FileErrorCode {
  FILE_NOT_FOUND = "FILE_NOT_FOUND",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  UNSUPPORTED_TYPE = "UNSUPPORTED_TYPE",
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  ENCODING_FAILED = "ENCODING_FAILED",
  SANDBOX_VIOLATION = "SANDBOX_VIOLATION",
  MIME_MISMATCH = "MIME_MISMATCH",
}

/**
 * Typed error for file processing failures.
 */
export class FileProcessorError extends Error {
  public readonly name = "FileProcessorError" as const;

  constructor(
    message: string,
    public readonly code: FileErrorCode,
    public readonly filePath: string,
  ) {
    super(message);
    Object.setPrototypeOf(this, FileProcessorError.prototype);
  }
}

/**
 * Magic byte signatures for MIME detection.
 */
export interface MagicSignature {
  readonly bytes: ReadonlyArray<number>;
  readonly offset: number;
  readonly mimeType: SupportedMimeType;
}

/**
 * Result of Gemini model selection.
 */
export type GeminiModel = "gemini-2.5-flash" | "gemini-2.5-pro";

/**
 * Input characteristics used for model routing.
 */
export interface ModelRoutingInput {
  readonly files: ReadonlyArray<ProcessedFile>;
  readonly promptTokenEstimate: number;
  readonly explicitModel?: string;
  readonly promptText?: string;
}

/**
 * A single part in a multi-part Gemini API request.
 */
export type ContentPart = TextPart | InlineDataPart;

export interface TextPart {
  readonly text: string;
}

export interface InlineDataPart {
  readonly inlineData: {
    readonly mimeType: string;
    readonly data: string;
  };
}

/**
 * Multi-part content array for the Gemini API.
 */
export interface MultiPartContent {
  readonly parts: ReadonlyArray<ContentPart>;
}
