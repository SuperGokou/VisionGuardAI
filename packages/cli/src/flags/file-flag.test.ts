import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseFileFlag, extractFileFlags } from "./file-flag.js";
import { existsSync } from "node:fs";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
}));

const mockExistsSync = vi.mocked(existsSync);

describe("parseFileFlag", () => {
  beforeEach(() => {
    mockExistsSync.mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses a single file path", () => {
    const result = parseFileFlag(["./image.png"]);
    expect(result.valid).toBe(true);
    expect(result.paths).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });

  it("parses comma-separated file paths", () => {
    const result = parseFileFlag(["./a.png,./b.jpg"]);
    expect(result.valid).toBe(true);
    expect(result.paths).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it("parses multiple flag values", () => {
    const result = parseFileFlag(["./a.png", "./b.jpg"]);
    expect(result.valid).toBe(true);
    expect(result.paths).toHaveLength(2);
  });

  it("trims whitespace from comma-separated paths", () => {
    const result = parseFileFlag(["./a.png , ./b.jpg"]);
    expect(result.valid).toBe(true);
    expect(result.paths).toHaveLength(2);
  });

  it("filters out empty segments from comma-separated paths", () => {
    const result = parseFileFlag(["./a.png,,./b.jpg"]);
    expect(result.valid).toBe(true);
    expect(result.paths).toHaveLength(2);
  });

  it("reports error for non-existent file", () => {
    mockExistsSync.mockReturnValue(false);
    const result = parseFileFlag(["./missing.png"]);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("File not found");
  });

  it("reports error when no paths provided", () => {
    const result = parseFileFlag([]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("No file paths provided");
  });

  it("includes valid paths and errors for mixed input", () => {
    mockExistsSync.mockImplementation((path: string) => {
      return !String(path).includes("missing");
    });
    const result = parseFileFlag(["./exists.png,./missing.jpg"]);
    expect(result.valid).toBe(false);
    expect(result.paths).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
  });

  it("resolves relative paths to absolute", () => {
    const result = parseFileFlag(["./image.png"]);
    expect(result.paths[0]).toMatch(/^[A-Z]:|^\//); // absolute path on Windows or Unix
  });

  it("preserves absolute paths as-is", () => {
    const absolutePath = process.platform === "win32"
      ? "C:\\Users\\test\\image.png"
      : "/home/test/image.png";
    mockExistsSync.mockReturnValue(true);
    const result = parseFileFlag([absolutePath]);
    expect(result.paths[0]).toBe(absolutePath);
  });
});

describe("extractFileFlags", () => {
  it("extracts --file flag with value", () => {
    const result = extractFileFlags(["--file", "image.png"]);
    expect(result).toEqual(["image.png"]);
  });

  it("extracts -f shorthand", () => {
    const result = extractFileFlags(["-f", "image.png"]);
    expect(result).toEqual(["image.png"]);
  });

  it("extracts --file= format", () => {
    const result = extractFileFlags(["--file=image.png"]);
    expect(result).toEqual(["image.png"]);
  });

  it("extracts multiple --file flags", () => {
    const result = extractFileFlags(["--file", "a.png", "--file", "b.jpg"]);
    expect(result).toEqual(["a.png", "b.jpg"]);
  });

  it("skips --file with no value", () => {
    const result = extractFileFlags(["--file"]);
    expect(result).toEqual([]);
  });

  it("skips --file followed by another flag", () => {
    const result = extractFileFlags(["--file", "--vision"]);
    expect(result).toEqual([]);
  });

  it("ignores --file= with empty value", () => {
    const result = extractFileFlags(["--file="]);
    expect(result).toEqual([]);
  });

  it("returns empty array when no --file flags present", () => {
    const result = extractFileFlags(["--vision", "auto", "prompt text"]);
    expect(result).toEqual([]);
  });

  it("handles mixed flags correctly", () => {
    const result = extractFileFlags([
      "--vision",
      "auto",
      "--file",
      "a.png",
      "--model",
      "pro",
      "-f",
      "b.jpg",
    ]);
    expect(result).toEqual(["a.png", "b.jpg"]);
  });
});
