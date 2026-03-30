import { MimeDetector } from "./MimeDetector.js";
import { PathResolver } from "./PathResolver.js";
import { Encoder } from "./Encoder.js";
import { Chunker } from "./Chunker.js";
import type { FileInput, FileProcessorConfig, ProcessedFile } from "./types.js";

/**
 * Default configuration for the file processor.
 */
const DEFAULT_CONFIG: FileProcessorConfig = {
  allowedDirectories: [process.cwd()],
  pdfChunkPages: 5,
  enableStreaming: true,
};

/**
 * Main orchestrator for file processing.
 *
 * Coordinates path resolution, MIME detection, encoding, and chunking
 * to produce ProcessedFile objects ready for the Gemini API.
 */
export class FileProcessor {
  private readonly mimeDetector: MimeDetector;
  private readonly pathResolver: PathResolver;
  private readonly encoder: Encoder;
  private readonly chunker: Chunker;
  private readonly config: FileProcessorConfig;

  constructor(config?: Partial<FileProcessorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.mimeDetector = new MimeDetector();
    this.pathResolver = new PathResolver(this.config.allowedDirectories);
    this.encoder = new Encoder();
    this.chunker = new Chunker(this.config.pdfChunkPages);
  }

  /**
   * Static convenience method: create a FileProcessor and process a single file.
   *
   * @param filePath - Path to the file to process.
   * @param config - Optional processor configuration.
   * @returns A fully processed file ready for API submission.
   */
  static async fromPath(
    filePath: string,
    config?: Partial<FileProcessorConfig>,
  ): Promise<ProcessedFile> {
    const processor = new FileProcessor(config);
    return processor.process({ path: filePath });
  }

  /**
   * Process a single file input into a ProcessedFile ready for the API.
   *
   * Pipeline:
   * 1. Resolve and validate the file path (sandbox check)
   * 2. Detect MIME type via magic bytes
   * 3. Validate MIME type against hint (if provided)
   * 4. Encode the file to base64
   * 5. For PDFs, optionally chunk into page ranges
   *
   * @param input - The file input with path and optional MIME hint.
   * @returns A fully processed file ready for API submission.
   */
  async process(input: FileInput): Promise<ProcessedFile> {
    // Step 1: Resolve path safely
    const resolvedPath = await this.pathResolver.resolve(input.path);

    // Step 2: Detect MIME type
    const mimeType = await this.mimeDetector.detect(resolvedPath);

    // Step 3: Validate hint
    this.mimeDetector.validateMimeHint(mimeType, input.mimeTypeHint, input.path);

    // Step 4: Get file size and encode
    const sizeBytes = await this.encoder.getFileSize(resolvedPath);
    const maxSizeOverride = this.config.maxFileSizeOverride?.[mimeType];
    const encodedData = await this.encoder.encode(resolvedPath, mimeType, maxSizeOverride);

    // Step 5: Category-specific processing
    const category = this.mimeDetector.getCategory(mimeType);
    const chunks =
      category === "pdf"
        ? await this.chunker.chunk(resolvedPath, encodedData)
        : undefined;

    return {
      originalPath: input.path,
      resolvedPath,
      mimeType,
      category,
      sizeBytes,
      encodedData,
      chunks,
    };
  }

  /**
   * Process multiple files in parallel.
   *
   * @param inputs - Array of file inputs.
   * @returns Array of processed files, in the same order as inputs.
   */
  async processMany(inputs: ReadonlyArray<FileInput>): Promise<ReadonlyArray<ProcessedFile>> {
    return Promise.all(inputs.map((input) => this.process(input)));
  }
}
