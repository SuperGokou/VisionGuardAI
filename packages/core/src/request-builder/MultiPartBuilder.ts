import type {
  ContentPart,
  InlineDataPart,
  MultiPartContent,
  ProcessedFile,
  TextPart,
} from "../file-processor/types.js";

/**
 * Builds multi-part content arrays for the Gemini API.
 *
 * Constructs the correct structure for requests that include both
 * text prompts and file data (images/PDFs) as inline_data parts.
 */
export class MultiPartBuilder {
  /**
   * Build a multi-part content object from text and processed files.
   *
   * The order is: file parts first, then text. This follows the Gemini API
   * convention where visual context comes before the text prompt.
   *
   * @param prompt - The text prompt from the user.
   * @param files - Processed files to include.
   * @returns A MultiPartContent object ready for the Gemini API.
   */
  build(prompt: string, files: ReadonlyArray<ProcessedFile>): MultiPartContent {
    const parts: ContentPart[] = [];

    for (const file of files) {
      if (file.chunks !== undefined && file.chunks.length > 1) {
        // For chunked PDFs, include each chunk as a separate part
        for (const chunk of file.chunks) {
          parts.push(
            this.createTextPart(
              `[PDF: ${file.originalPath} - Pages ${chunk.pageRange.start}-${chunk.pageRange.end} of ${chunk.totalChunks} chunks]`,
            ),
          );
          parts.push(
            this.createInlineDataPart(file.mimeType, chunk.encodedData),
          );
        }
      } else {
        // Single file or single-chunk PDF
        parts.push(
          this.createInlineDataPart(file.mimeType, file.encodedData),
        );
      }
    }

    // Text prompt comes after file parts
    if (prompt.length > 0) {
      parts.push(this.createTextPart(prompt));
    }

    return { parts };
  }

  /**
   * Build content with only text (no files).
   */
  buildTextOnly(prompt: string): MultiPartContent {
    return {
      parts: [this.createTextPart(prompt)],
    };
  }

  /**
   * Build content with only file(s) and no text prompt.
   */
  buildFilesOnly(files: ReadonlyArray<ProcessedFile>): MultiPartContent {
    return this.build("", files);
  }

  /**
   * Estimate the total size of the request payload in bytes.
   * Useful for checking against API limits.
   */
  estimatePayloadSize(content: MultiPartContent): number {
    let totalBytes = 0;
    for (const part of content.parts) {
      if ("text" in part) {
        totalBytes += Buffer.byteLength(part.text, "utf8");
      } else {
        // base64 data size
        totalBytes += part.inlineData.data.length;
      }
    }
    return totalBytes;
  }

  /**
   * Estimate the total token count for a multi-part content object.
   * Uses heuristic: ~4 characters per token for text, ~258 tokens per KB for images.
   */
  estimateTokenCount(content: MultiPartContent): number {
    let tokens = 0;
    for (const part of content.parts) {
      if ("text" in part) {
        tokens += Math.ceil(part.text.length / 4);
      } else {
        // base64 data: estimate raw bytes, then approximate image tokens
        const rawBytes = Math.ceil(part.inlineData.data.length * 0.75);
        tokens += Math.ceil(rawBytes / 1024) * 258;
      }
    }
    return tokens;
  }

  /**
   * Count the number of parts by type.
   */
  countParts(content: MultiPartContent): { text: number; file: number; total: number } {
    let text = 0;
    let file = 0;
    for (const part of content.parts) {
      if ("text" in part) {
        text++;
      } else {
        file++;
      }
    }
    return { text, file, total: text + file };
  }

  private createTextPart(text: string): TextPart {
    return { text };
  }

  private createInlineDataPart(mimeType: string, data: string): InlineDataPart {
    return {
      inlineData: {
        mimeType,
        data,
      },
    };
  }
}
