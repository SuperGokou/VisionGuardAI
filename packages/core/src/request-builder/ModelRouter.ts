import type { GeminiModel, ModelRoutingInput, ProcessedFile } from "../file-processor/types.js";

/**
 * Token threshold for simple vs complex prompts.
 */
const SIMPLE_PROMPT_THRESHOLD = 100;

/**
 * Keywords that indicate code-related prompts requiring Pro model.
 */
const CODE_KEYWORDS: ReadonlyArray<string> = [
  "function",
  "class",
  "import",
  "export",
  "const",
  "interface",
  "async",
  "await",
  "return",
  "typescript",
  "javascript",
  "python",
  "refactor",
  "debug",
  "bug",
  "error",
  "compile",
  "syntax",
  "algorithm",
  "implement",
  "optimize",
];

/**
 * Auto-selects the appropriate Gemini model based on input characteristics.
 *
 * Routing logic:
 * - If user explicitly specifies a model, use that.
 * - If single image + short prompt -> Flash (cheaper/faster)
 * - If PDF, multi-image, or complex prompt -> Pro (more capable)
 * - Default -> Flash
 */
export class ModelRouter {
  /**
   * Select the optimal model for the given input.
   *
   * @param input - The routing input with files, prompt estimate, and optional explicit model.
   * @returns The selected Gemini model identifier.
   */
  select(input: ModelRoutingInput): GeminiModel {
    // Explicit model override takes priority
    if (input.explicitModel !== undefined) {
      return this.validateModelName(input.explicitModel);
    }

    // No files - default to Flash
    if (input.files.length === 0) {
      return "gemini-2.5-flash";
    }

    // Multiple files -> Pro
    if (input.files.length > 1) {
      return "gemini-2.5-pro";
    }

    const singleFile = input.files[0];

    // PDF -> Pro (more capable at document understanding)
    if (singleFile.category === "pdf") {
      return "gemini-2.5-pro";
    }

    // Single image + complex prompt -> Pro
    if (input.promptTokenEstimate > SIMPLE_PROMPT_THRESHOLD) {
      return "gemini-2.5-pro";
    }

    // Code-related prompt -> Pro
    if (input.promptText !== undefined && this.containsCodeKeywords(input.promptText)) {
      return "gemini-2.5-pro";
    }

    // Single image + simple prompt -> Flash
    return "gemini-2.5-flash";
  }

  /**
   * Get a human-readable explanation of why a model was selected.
   */
  explain(input: ModelRoutingInput): string {
    if (input.explicitModel !== undefined) {
      return `Using explicitly requested model: ${input.explicitModel}`;
    }

    if (input.files.length === 0) {
      return "No files provided, using Flash (default)";
    }

    if (input.files.length > 1) {
      return `Multiple files (${input.files.length}), using Pro for better multi-file understanding`;
    }

    const singleFile = input.files[0];

    if (singleFile.category === "pdf") {
      return "PDF input detected, using Pro for document analysis";
    }

    if (input.promptTokenEstimate > SIMPLE_PROMPT_THRESHOLD) {
      return `Complex prompt (~${input.promptTokenEstimate} tokens), using Pro`;
    }

    if (input.promptText !== undefined && this.containsCodeKeywords(input.promptText)) {
      return "Code-related prompt detected, using Pro for better analysis";
    }

    return "Simple image + short prompt, using Flash for speed";
  }

  /**
   * Estimate token count from a text prompt.
   * Uses a simple heuristic: ~4 characters per token.
   */
  estimateTokens(prompt: string): number {
    return Math.ceil(prompt.length / 4);
  }

  /**
   * Check if a prompt contains code-related keywords.
   */
  containsCodeKeywords(prompt: string): boolean {
    const lowerPrompt = prompt.toLowerCase();
    return CODE_KEYWORDS.some((keyword) => lowerPrompt.includes(keyword));
  }

  private validateModelName(model: string): GeminiModel {
    const normalized = model.toLowerCase().trim();

    if (normalized.includes("pro")) {
      return "gemini-2.5-pro";
    }
    if (normalized.includes("flash")) {
      return "gemini-2.5-flash";
    }

    // If unrecognized, default to the requested string mapped to Flash
    return "gemini-2.5-flash";
  }
}
