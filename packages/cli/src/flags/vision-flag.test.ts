import { describe, it, expect } from "vitest";
import {
  parseVisionFlag,
  extractVisionFlag,
  getVisionPrompt,
  validateVisionFiles,
} from "./vision-flag.js";

describe("parseVisionFlag", () => {
  it("returns disabled when flag is not present", () => {
    const result = parseVisionFlag(undefined);
    expect(result.enabled).toBe(false);
    expect(result.mode).toBe("auto");
    expect(result.valid).toBe(true);
  });

  it("returns auto mode when flag is present without value", () => {
    const result = parseVisionFlag(true);
    expect(result.enabled).toBe(true);
    expect(result.mode).toBe("auto");
    expect(result.valid).toBe(true);
  });

  it("returns auto mode when flag has empty string value", () => {
    const result = parseVisionFlag("");
    expect(result.enabled).toBe(true);
    expect(result.mode).toBe("auto");
    expect(result.valid).toBe(true);
  });

  it("parses describe mode", () => {
    const result = parseVisionFlag("describe");
    expect(result.enabled).toBe(true);
    expect(result.mode).toBe("describe");
    expect(result.valid).toBe(true);
  });

  it("parses analyze mode", () => {
    const result = parseVisionFlag("analyze");
    expect(result.enabled).toBe(true);
    expect(result.mode).toBe("analyze");
    expect(result.valid).toBe(true);
  });

  it("parses code-review mode", () => {
    const result = parseVisionFlag("code-review");
    expect(result.enabled).toBe(true);
    expect(result.mode).toBe("code-review");
    expect(result.valid).toBe(true);
  });

  it("parses diff mode", () => {
    const result = parseVisionFlag("diff");
    expect(result.enabled).toBe(true);
    expect(result.mode).toBe("diff");
    expect(result.valid).toBe(true);
  });

  it("is case-insensitive", () => {
    const result = parseVisionFlag("DESCRIBE");
    expect(result.enabled).toBe(true);
    expect(result.mode).toBe("describe");
    expect(result.valid).toBe(true);
  });

  it("trims whitespace", () => {
    const result = parseVisionFlag("  analyze  ");
    expect(result.enabled).toBe(true);
    expect(result.mode).toBe("analyze");
    expect(result.valid).toBe(true);
  });

  it("rejects invalid mode", () => {
    const result = parseVisionFlag("unknown");
    expect(result.enabled).toBe(false);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid vision mode");
    expect(result.error).toContain("unknown");
  });
});

describe("extractVisionFlag", () => {
  it("extracts --vision flag with value", () => {
    const result = extractVisionFlag(["--vision", "describe"]);
    expect(result).toBe("describe");
  });

  it("extracts -v shorthand", () => {
    const result = extractVisionFlag(["-v", "analyze"]);
    expect(result).toBe("analyze");
  });

  it("extracts --vision= format", () => {
    const result = extractVisionFlag(["--vision=diff"]);
    expect(result).toBe("diff");
  });

  it("returns true when --vision is present without value", () => {
    const result = extractVisionFlag(["--vision"]);
    expect(result).toBe(true);
  });

  it("returns true when -v is present without value", () => {
    const result = extractVisionFlag(["-v"]);
    expect(result).toBe(true);
  });

  it("returns true when --vision is followed by a flag", () => {
    const result = extractVisionFlag(["--vision", "--file", "img.png"]);
    expect(result).toBe(true);
  });

  it("returns undefined when flag is not present", () => {
    const result = extractVisionFlag(["--file", "img.png"]);
    expect(result).toBeUndefined();
  });

  it("returns undefined for empty argv", () => {
    const result = extractVisionFlag([]);
    expect(result).toBeUndefined();
  });
});

describe("getVisionPrompt", () => {
  it("returns prompt for auto mode", () => {
    const prompt = getVisionPrompt("auto");
    expect(prompt).toContain("Analyze");
  });

  it("returns prompt for describe mode", () => {
    const prompt = getVisionPrompt("describe");
    expect(prompt).toContain("Describe");
  });

  it("returns prompt for analyze mode", () => {
    const prompt = getVisionPrompt("analyze");
    expect(prompt).toContain("analysis");
  });

  it("returns prompt for code-review mode", () => {
    const prompt = getVisionPrompt("code-review");
    expect(prompt).toContain("Review the code");
  });

  it("returns prompt for diff mode", () => {
    const prompt = getVisionPrompt("diff");
    expect(prompt).toContain("Compare");
  });
});

describe("validateVisionFiles", () => {
  it("accepts image files", () => {
    const result = validateVisionFiles([
      "/path/to/image.png",
      "/path/to/photo.jpg",
      "/path/to/pic.webp",
    ]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("accepts .jpeg extension", () => {
    const result = validateVisionFiles(["/path/to/photo.jpeg"]);
    expect(result.valid).toBe(true);
  });

  it("rejects PDF files with clear error", () => {
    const result = validateVisionFiles(["/path/to/doc.pdf"]);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Cannot use --vision with PDF files");
    expect(result.errors[0]).toContain("Use --file instead");
  });

  it("rejects unsupported file types", () => {
    const result = validateVisionFiles(["/path/to/data.csv"]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Unsupported file type for --vision");
  });

  it("handles mixed valid and invalid files", () => {
    const result = validateVisionFiles([
      "/path/to/image.png",
      "/path/to/doc.pdf",
      "/path/to/photo.jpg",
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("PDF");
  });

  it("is case-insensitive for extensions", () => {
    const result = validateVisionFiles(["/path/to/IMAGE.PNG"]);
    expect(result.valid).toBe(true);
  });

  it("handles empty array", () => {
    const result = validateVisionFiles([]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
