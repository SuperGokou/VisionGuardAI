import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseFileFlag, extractFileFlags } from "../flags/file-flag.js";
import {
  parseVisionFlag,
  extractVisionFlag,
  getVisionPrompt,
} from "../flags/vision-flag.js";

describe("file-flag", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `visionguard-test-flags-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe("extractFileFlags", () => {
    it("should extract --file values", () => {
      const argv = ["node", "cli", "--file", "a.png", "--file", "b.jpg"];
      const result = extractFileFlags(argv);
      expect(result).toEqual(["a.png", "b.jpg"]);
    });

    it("should extract -f shorthand", () => {
      const argv = ["node", "cli", "-f", "image.png"];
      const result = extractFileFlags(argv);
      expect(result).toEqual(["image.png"]);
    });

    it("should extract --file=value format", () => {
      const argv = ["node", "cli", "--file=photo.jpg"];
      const result = extractFileFlags(argv);
      expect(result).toEqual(["photo.jpg"]);
    });

    it("should return empty array when no file flags present", () => {
      const argv = ["node", "cli", "--help"];
      const result = extractFileFlags(argv);
      expect(result).toEqual([]);
    });

    it("should skip --file when followed by another flag", () => {
      const argv = ["node", "cli", "--file", "--help"];
      const result = extractFileFlags(argv);
      expect(result).toEqual([]);
    });
  });

  describe("parseFileFlag", () => {
    it("should validate existing files", async () => {
      const filePath = join(testDir, "test.png");
      await writeFile(filePath, Buffer.from([0x89, 0x50]));

      const result = parseFileFlag([filePath]);
      expect(result.valid).toBe(true);
      expect(result.paths).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });

    it("should report errors for missing files", () => {
      const result = parseFileFlag(["/nonexistent/file.png"]);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("not found");
    });

    it("should handle comma-separated paths", async () => {
      const file1 = join(testDir, "a.png");
      const file2 = join(testDir, "b.jpg");
      await writeFile(file1, Buffer.from([0x89]));
      await writeFile(file2, Buffer.from([0xff]));

      const result = parseFileFlag([`${file1},${file2}`]);
      expect(result.paths).toHaveLength(2);
      expect(result.valid).toBe(true);
    });

    it("should report error when no paths provided", () => {
      const result = parseFileFlag([]);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("No file paths");
    });
  });
});

describe("vision-flag", () => {
  describe("extractVisionFlag", () => {
    it("should extract --vision with value", () => {
      const argv = ["node", "cli", "--vision", "describe"];
      const result = extractVisionFlag(argv);
      expect(result).toBe("describe");
    });

    it("should return true for --vision without value", () => {
      const argv = ["node", "cli", "--vision"];
      const result = extractVisionFlag(argv);
      expect(result).toBe(true);
    });

    it("should extract --vision=value format", () => {
      const argv = ["node", "cli", "--vision=analyze"];
      const result = extractVisionFlag(argv);
      expect(result).toBe("analyze");
    });

    it("should extract -v shorthand", () => {
      const argv = ["node", "cli", "-v", "code-review"];
      const result = extractVisionFlag(argv);
      expect(result).toBe("code-review");
    });

    it("should return undefined when flag not present", () => {
      const argv = ["node", "cli", "--file", "test.png"];
      const result = extractVisionFlag(argv);
      expect(result).toBeUndefined();
    });
  });

  describe("parseVisionFlag", () => {
    it("should parse undefined as disabled", () => {
      const result = parseVisionFlag(undefined);
      expect(result.enabled).toBe(false);
      expect(result.valid).toBe(true);
    });

    it("should parse true (no value) as auto mode", () => {
      const result = parseVisionFlag(true);
      expect(result.enabled).toBe(true);
      expect(result.mode).toBe("auto");
      expect(result.valid).toBe(true);
    });

    it("should parse valid modes", () => {
      for (const mode of ["auto", "describe", "analyze", "code-review", "diff"]) {
        const result = parseVisionFlag(mode);
        expect(result.enabled).toBe(true);
        expect(result.mode).toBe(mode);
        expect(result.valid).toBe(true);
      }
    });

    it("should reject invalid modes", () => {
      const result = parseVisionFlag("invalid-mode");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid vision mode");
    });

    it("should be case-insensitive", () => {
      const result = parseVisionFlag("DESCRIBE");
      expect(result.mode).toBe("describe");
      expect(result.valid).toBe(true);
    });
  });

  describe("getVisionPrompt", () => {
    it("should return appropriate prompts for each mode", () => {
      expect(getVisionPrompt("auto")).toContain("Analyze");
      expect(getVisionPrompt("describe")).toContain("Describe");
      expect(getVisionPrompt("analyze")).toContain("analysis");
      expect(getVisionPrompt("code-review")).toContain("Review");
      expect(getVisionPrompt("diff")).toContain("Compare");
    });
  });
});
