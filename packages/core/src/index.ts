// File processing
export {
  FileProcessor,
  MimeDetector,
  PathResolver,
  Encoder,
  Chunker,
  FileProcessorError,
  FileErrorCode,
  SUPPORTED_MIME_TYPES,
} from "./file-processor/index.js";

// Request building
export { MultiPartBuilder, ModelRouter } from "./request-builder/index.js";

// Types
export type {
  SupportedMimeType,
  FileCategory,
  FileInput,
  ProcessedFile,
  EncodedChunk,
  PageRange,
  FileProcessorConfig,
  MagicSignature,
  GeminiModel,
  ModelRoutingInput,
  ContentPart,
  TextPart,
  InlineDataPart,
  MultiPartContent,
} from "./file-processor/types.js";
