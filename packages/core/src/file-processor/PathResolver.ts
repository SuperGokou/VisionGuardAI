import { access, realpath } from "node:fs/promises";
import { constants } from "node:fs";
import { isAbsolute, normalize, resolve } from "node:path";
import { FileErrorCode, FileProcessorError } from "./types.js";

/**
 * Sandbox-safe path resolver that prevents directory traversal attacks
 * and ensures files are within allowed directories.
 */
export class PathResolver {
  private readonly allowedDirectories: ReadonlyArray<string>;

  constructor(allowedDirectories: ReadonlyArray<string>) {
    if (allowedDirectories.length === 0) {
      throw new Error("At least one allowed directory must be specified");
    }
    this.allowedDirectories = allowedDirectories.map((dir) => normalize(resolve(dir)));
  }

  /**
   * Resolve a user-provided path to a safe, canonical absolute path.
   *
   * Steps:
   * 1. Resolve to absolute path
   * 2. Normalize (remove . and ..)
   * 3. Resolve symlinks to real path
   * 4. Verify the real path is within allowed directories
   * 5. Verify the file exists and is readable
   *
   * @param inputPath - The user-provided file path (absolute or relative).
   * @returns The resolved, validated absolute path.
   * @throws FileProcessorError on any violation.
   */
  async resolve(inputPath: string): Promise<string> {
    // Step 1 & 2: Resolve and normalize
    const absolutePath = isAbsolute(inputPath) ? normalize(inputPath) : normalize(resolve(inputPath));

    // Early check: reject paths that still contain ".." after normalization
    // This catches cases where normalize keeps ".." (e.g., paths that escape root)
    if (absolutePath.includes("..")) {
      throw new FileProcessorError(
        `Path traversal detected: "${inputPath}"`,
        FileErrorCode.SANDBOX_VIOLATION,
        inputPath,
      );
    }

    // Step 3: Check file exists before resolving symlinks
    await this.checkFileExists(absolutePath, inputPath);

    // Step 4: Resolve symlinks to get the real path
    let realFilePath: string;
    try {
      realFilePath = await realpath(absolutePath);
    } catch {
      throw new FileProcessorError(
        `Failed to resolve real path for: ${inputPath}`,
        FileErrorCode.FILE_NOT_FOUND,
        inputPath,
      );
    }

    // Step 5: Verify real path is within allowed directories
    this.checkSandbox(realFilePath, inputPath);

    // Step 6: Verify the file is readable
    await this.checkReadable(realFilePath, inputPath);

    return realFilePath;
  }

  /**
   * Check if a given path would be allowed without fully resolving it.
   * Useful for pre-validation before expensive operations.
   */
  isWithinAllowedDirectories(filePath: string): boolean {
    const normalizedPath = normalize(resolve(filePath));
    return this.allowedDirectories.some((dir) => normalizedPath.startsWith(dir));
  }

  private async checkFileExists(absolutePath: string, originalPath: string): Promise<void> {
    try {
      await access(absolutePath, constants.F_OK);
    } catch {
      throw new FileProcessorError(
        `File not found: ${originalPath}`,
        FileErrorCode.FILE_NOT_FOUND,
        originalPath,
      );
    }
  }

  private checkSandbox(realPath: string, originalPath: string): void {
    const normalizedRealPath = normalize(realPath);
    const isAllowed = this.allowedDirectories.some((dir) =>
      normalizedRealPath.startsWith(dir),
    );

    if (!isAllowed) {
      throw new FileProcessorError(
        `Access denied: "${originalPath}" resolves to "${realPath}" which is outside allowed directories`,
        FileErrorCode.SANDBOX_VIOLATION,
        originalPath,
      );
    }
  }

  private async checkReadable(filePath: string, originalPath: string): Promise<void> {
    try {
      await access(filePath, constants.R_OK);
    } catch {
      throw new FileProcessorError(
        `Permission denied: cannot read "${originalPath}"`,
        FileErrorCode.PERMISSION_DENIED,
        originalPath,
      );
    }
  }
}
