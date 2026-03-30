/**
 * Vision mode options.
 */
export type VisionMode = "auto" | "describe" | "analyze" | "code-review" | "diff";

/**
 * All valid vision modes.
 */
const VALID_VISION_MODES: ReadonlyArray<VisionMode> = [
  "auto",
  "describe",
  "analyze",
  "code-review",
  "diff",
];

/**
 * Parsed result of the --vision flag.
 */
export interface VisionFlagResult {
  readonly enabled: boolean;
  readonly mode: VisionMode;
  readonly valid: boolean;
  readonly error?: string;
}

/**
 * Parse and validate the --vision flag value.
 *
 * Accepts:
 * - --vision (no value = "auto" mode)
 * - --vision=describe
 * - --vision analyze
 *
 * @param rawValue - The raw flag value, or undefined if flag not present.
 * @returns Parsed vision mode configuration.
 */
export function parseVisionFlag(rawValue: string | undefined | true): VisionFlagResult {
  // Flag not present
  if (rawValue === undefined) {
    return {
      enabled: false,
      mode: "auto",
      valid: true,
    };
  }

  // Flag present with no value (--vision by itself)
  if (rawValue === true || rawValue === "") {
    return {
      enabled: true,
      mode: "auto",
      valid: true,
    };
  }

  const normalized = rawValue.toLowerCase().trim();

  if (!isValidVisionMode(normalized)) {
    return {
      enabled: false,
      mode: "auto",
      valid: false,
      error: `Invalid vision mode: "${rawValue}". Valid modes: ${VALID_VISION_MODES.join(", ")}`,
    };
  }

  return {
    enabled: true,
    mode: normalized,
    valid: true,
  };
}

/**
 * Extract --vision flag value from a raw argv array.
 *
 * @param argv - The process.argv-style array.
 * @returns The raw vision flag value, true if flag present without value, or undefined.
 */
export function extractVisionFlag(
  argv: ReadonlyArray<string>,
): string | true | undefined {
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--vision" || argv[i] === "-v") {
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("-")) {
        return next;
      }
      return true;
    }
    if (argv[i]?.startsWith("--vision=")) {
      return argv[i].slice("--vision=".length);
    }
  }

  return undefined;
}

/**
 * Get the system prompt modifier for a given vision mode.
 */
export function getVisionPrompt(mode: VisionMode): string {
  switch (mode) {
    case "auto":
      return "Analyze the provided file(s) and respond appropriately based on the content.";
    case "describe":
      return "Describe the contents of the provided file(s) in detail.";
    case "analyze":
      return "Provide a thorough analysis of the provided file(s), including structure, patterns, and notable elements.";
    case "code-review":
      return "Review the code shown in the provided file(s). Identify bugs, suggest improvements, and assess code quality.";
    case "diff":
      return "Compare the provided files and highlight differences, similarities, and changes.";
  }
}

/**
 * Image-only extensions allowed when --vision flag is used.
 * PDFs are rejected because --vision is for image analysis only.
 */
const IMAGE_ONLY_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

/**
 * Validate that file paths are image-only when --vision flag is used.
 * Rejects PDF files with a clear error message.
 *
 * @param filePaths - Resolved file paths to validate.
 * @returns Object with valid status and any error messages.
 */
export function validateVisionFiles(
  filePaths: ReadonlyArray<string>,
): { readonly valid: boolean; readonly errors: ReadonlyArray<string> } {
  const errors: string[] = [];

  for (const filePath of filePaths) {
    const lowerPath = filePath.toLowerCase();
    if (lowerPath.endsWith(".pdf")) {
      errors.push(
        `Cannot use --vision with PDF files: "${filePath}". Use --file instead for document analysis.`,
      );
      continue;
    }

    const hasValidExtension = IMAGE_ONLY_EXTENSIONS.some((ext) =>
      lowerPath.endsWith(ext),
    );
    if (!hasValidExtension) {
      errors.push(
        `Unsupported file type for --vision: "${filePath}". Supported: ${IMAGE_ONLY_EXTENSIONS.join(", ")}`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function isValidVisionMode(value: string): value is VisionMode {
  return (VALID_VISION_MODES as ReadonlyArray<string>).includes(value);
}
