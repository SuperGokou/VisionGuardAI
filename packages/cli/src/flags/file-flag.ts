import { existsSync } from "node:fs";
import { resolve, isAbsolute } from "node:path";

/**
 * Parsed result of the --file flag.
 */
export interface FileFlagResult {
  readonly paths: ReadonlyArray<string>;
  readonly valid: boolean;
  readonly errors: ReadonlyArray<string>;
}

/**
 * Parse and validate the --file flag value(s).
 *
 * Accepts:
 * - Single path: --file ./image.png
 * - Multiple paths (comma-separated): --file ./a.png,./b.jpg
 * - Multiple flags: --file ./a.png --file ./b.jpg
 *
 * @param rawValues - The raw flag value(s) from argv.
 * @returns Parsed and validated file paths with any errors.
 */
export function parseFileFlag(rawValues: ReadonlyArray<string>): FileFlagResult {
  const errors: string[] = [];
  const paths: string[] = [];

  for (const raw of rawValues) {
    // Support comma-separated paths
    const segments = raw.split(",").map((s) => s.trim()).filter((s) => s.length > 0);

    for (const segment of segments) {
      const resolvedPath = isAbsolute(segment) ? segment : resolve(process.cwd(), segment);

      if (!existsSync(resolvedPath)) {
        errors.push(`File not found: ${segment}`);
        continue;
      }

      paths.push(resolvedPath);
    }
  }

  if (paths.length === 0 && errors.length === 0) {
    errors.push("No file paths provided with --file flag");
  }

  return {
    paths,
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Extract --file flag values from a raw argv array.
 *
 * @param argv - The process.argv-style array.
 * @returns Array of raw values found after --file flags.
 */
export function extractFileFlags(argv: ReadonlyArray<string>): ReadonlyArray<string> {
  const values: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--file" || argv[i] === "-f") {
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("-")) {
        values.push(next);
        i++; // Skip the value
      }
    } else if (argv[i]?.startsWith("--file=")) {
      const value = argv[i].slice("--file=".length);
      if (value.length > 0) {
        values.push(value);
      }
    }
  }

  return values;
}
