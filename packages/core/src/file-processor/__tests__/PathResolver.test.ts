import { describe, it, expect, afterAll } from "vitest";
import { join, resolve } from "node:path";
import { mkdirSync, writeFileSync, symlinkSync, unlinkSync, rmdirSync, existsSync } from "node:fs";
import { PathResolver } from "../PathResolver.js";
import { FileErrorCode, FileProcessorError } from "../types.js";

const FIXTURES = join(__dirname, "..", "__fixtures__");
const TEMP_DIR = join(FIXTURES, "_temp_path_tests");

describe("PathResolver", () => {
  // Setup temp directory
  mkdirSync(TEMP_DIR, { recursive: true });
  writeFileSync(join(TEMP_DIR, "readable-file.txt"), "hello");

  afterAll(() => {
    try {
      const files = ["readable-file.txt", "symlink-internal.txt"];
      for (const f of files) {
        const p = join(TEMP_DIR, f);
        if (existsSync(p)) unlinkSync(p);
      }
      if (existsSync(TEMP_DIR)) rmdirSync(TEMP_DIR);
    } catch {
      // cleanup best-effort
    }
  });

  describe("constructor", () => {
    it("throws if no allowed directories given", () => {
      expect(() => new PathResolver([])).toThrow("At least one allowed directory");
    });

    it("normalizes allowed directories", () => {
      const resolver = new PathResolver([FIXTURES]);
      expect(resolver.isWithinAllowedDirectories(join(FIXTURES, "test-image.png"))).toBe(true);
    });
  });

  describe("resolve()", () => {
    it("resolves an absolute path to a readable file", async () => {
      const resolver = new PathResolver([TEMP_DIR]);
      const filePath = join(TEMP_DIR, "readable-file.txt");
      const result = await resolver.resolve(filePath);
      expect(result).toContain("readable-file.txt");
    });

    it("resolves a relative path from cwd", async () => {
      const resolver = new PathResolver([resolve(".")]);
      const tempPath = resolve("_test_temp_file.txt");
      writeFileSync(tempPath, "test");
      try {
        const result = await resolver.resolve("_test_temp_file.txt");
        expect(result).toContain("_test_temp_file.txt");
      } finally {
        unlinkSync(tempPath);
      }
    });

    it("throws SANDBOX_VIOLATION for path outside allowed dirs", async () => {
      const subDir = join(TEMP_DIR, "subdir");
      mkdirSync(subDir, { recursive: true });
      writeFileSync(join(subDir, "test.txt"), "ok");
      const resolver = new PathResolver([subDir]);

      await expect(
        resolver.resolve(join(TEMP_DIR, "readable-file.txt")),
      ).rejects.toThrow(
        expect.objectContaining({
          code: FileErrorCode.SANDBOX_VIOLATION,
        }),
      );

      unlinkSync(join(subDir, "test.txt"));
      rmdirSync(subDir);
    });

    it("throws FILE_NOT_FOUND for nonexistent file", async () => {
      const resolver = new PathResolver([TEMP_DIR]);
      await expect(
        resolver.resolve(join(TEMP_DIR, "does-not-exist.txt")),
      ).rejects.toThrow(
        expect.objectContaining({
          code: FileErrorCode.FILE_NOT_FOUND,
        }),
      );
    });

    it("resolves symlinks pointing within allowed directory", async () => {
      const resolver = new PathResolver([TEMP_DIR]);
      const targetPath = join(TEMP_DIR, "readable-file.txt");
      const symlinkPath = join(TEMP_DIR, "symlink-internal.txt");

      try {
        symlinkSync(targetPath, symlinkPath);
      } catch {
        // symlinks may require admin on Windows; skip
        return;
      }

      try {
        const result = await resolver.resolve(symlinkPath);
        expect(result).toContain("readable-file.txt");
      } finally {
        if (existsSync(symlinkPath)) unlinkSync(symlinkPath);
      }
    });
  });

  describe("isWithinAllowedDirectories()", () => {
    it("returns true for path inside allowed directory", () => {
      const resolver = new PathResolver([FIXTURES]);
      expect(resolver.isWithinAllowedDirectories(join(FIXTURES, "test-image.png"))).toBe(true);
    });

    it("returns false for path outside allowed directory", () => {
      const resolver = new PathResolver([FIXTURES]);
      expect(resolver.isWithinAllowedDirectories("/etc/passwd")).toBe(false);
    });

    it("supports multiple allowed directories", () => {
      const resolver = new PathResolver([FIXTURES, "/tmp"]);
      expect(resolver.isWithinAllowedDirectories(join(FIXTURES, "test-image.png"))).toBe(true);
    });
  });
});
