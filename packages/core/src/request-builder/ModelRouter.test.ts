import { describe, it, expect } from "vitest";
import { ModelRouter } from "./ModelRouter.js";
import type { ProcessedFile } from "../file-processor/types.js";

function createMockFile(overrides: Partial<ProcessedFile> = {}): ProcessedFile {
  return {
    originalPath: "/test/image.png",
    resolvedPath: "/test/image.png",
    mimeType: "image/png",
    category: "image",
    sizeBytes: 1024,
    encodedData: "base64data",
    ...overrides,
  };
}

describe("ModelRouter", () => {
  const router = new ModelRouter();

  describe("select", () => {
    it("uses explicit model override when provided (pro)", () => {
      const result = router.select({
        files: [],
        promptTokenEstimate: 10,
        explicitModel: "pro",
      });
      expect(result).toBe("gemini-2.5-pro");
    });

    it("uses explicit model override when provided (flash)", () => {
      const result = router.select({
        files: [],
        promptTokenEstimate: 10,
        explicitModel: "flash",
      });
      expect(result).toBe("gemini-2.5-flash");
    });

    it("normalizes explicit model name case", () => {
      const result = router.select({
        files: [],
        promptTokenEstimate: 10,
        explicitModel: "PRO",
      });
      expect(result).toBe("gemini-2.5-pro");
    });

    it("defaults unrecognized model to flash", () => {
      const result = router.select({
        files: [],
        promptTokenEstimate: 10,
        explicitModel: "unknown-model",
      });
      expect(result).toBe("gemini-2.5-flash");
    });

    it("defaults to flash when no files", () => {
      const result = router.select({
        files: [],
        promptTokenEstimate: 10,
      });
      expect(result).toBe("gemini-2.5-flash");
    });

    it("selects pro for multiple files", () => {
      const result = router.select({
        files: [createMockFile(), createMockFile()],
        promptTokenEstimate: 10,
      });
      expect(result).toBe("gemini-2.5-pro");
    });

    it("selects pro for PDF files", () => {
      const result = router.select({
        files: [createMockFile({ category: "pdf", mimeType: "application/pdf" })],
        promptTokenEstimate: 10,
      });
      expect(result).toBe("gemini-2.5-pro");
    });

    it("selects pro for complex prompts (>100 tokens)", () => {
      const result = router.select({
        files: [createMockFile()],
        promptTokenEstimate: 150,
      });
      expect(result).toBe("gemini-2.5-pro");
    });

    it("selects flash for single image with simple prompt", () => {
      const result = router.select({
        files: [createMockFile()],
        promptTokenEstimate: 10,
      });
      expect(result).toBe("gemini-2.5-flash");
    });

    it("selects pro for code-related prompts", () => {
      const result = router.select({
        files: [createMockFile()],
        promptTokenEstimate: 20,
        promptText: "Review this function and find the bug",
      });
      expect(result).toBe("gemini-2.5-pro");
    });

    it("selects pro for prompts with class keyword", () => {
      const result = router.select({
        files: [createMockFile()],
        promptTokenEstimate: 15,
        promptText: "Explain this class diagram",
      });
      expect(result).toBe("gemini-2.5-pro");
    });

    it("selects pro for prompts with import keyword", () => {
      const result = router.select({
        files: [createMockFile()],
        promptTokenEstimate: 10,
        promptText: "What does this import do?",
      });
      expect(result).toBe("gemini-2.5-pro");
    });

    it("selects flash when prompt has no code keywords", () => {
      const result = router.select({
        files: [createMockFile()],
        promptTokenEstimate: 10,
        promptText: "What is in this picture?",
      });
      expect(result).toBe("gemini-2.5-flash");
    });

    it("explicit model takes priority over all other rules", () => {
      const result = router.select({
        files: [
          createMockFile({ category: "pdf", mimeType: "application/pdf" }),
          createMockFile(),
        ],
        promptTokenEstimate: 500,
        explicitModel: "flash",
        promptText: "debug this function",
      });
      expect(result).toBe("gemini-2.5-flash");
    });
  });

  describe("explain", () => {
    it("explains explicit model selection", () => {
      const explanation = router.explain({
        files: [],
        promptTokenEstimate: 10,
        explicitModel: "pro",
      });
      expect(explanation).toContain("explicitly requested");
    });

    it("explains no-files default", () => {
      const explanation = router.explain({
        files: [],
        promptTokenEstimate: 10,
      });
      expect(explanation).toContain("No files");
      expect(explanation).toContain("Flash");
    });

    it("explains multi-file selection", () => {
      const explanation = router.explain({
        files: [createMockFile(), createMockFile()],
        promptTokenEstimate: 10,
      });
      expect(explanation).toContain("Multiple files");
    });

    it("explains PDF selection", () => {
      const explanation = router.explain({
        files: [createMockFile({ category: "pdf", mimeType: "application/pdf" })],
        promptTokenEstimate: 10,
      });
      expect(explanation).toContain("PDF");
    });

    it("explains complex prompt selection", () => {
      const explanation = router.explain({
        files: [createMockFile()],
        promptTokenEstimate: 150,
      });
      expect(explanation).toContain("Complex prompt");
    });

    it("explains code keyword selection", () => {
      const explanation = router.explain({
        files: [createMockFile()],
        promptTokenEstimate: 10,
        promptText: "Refactor this code",
      });
      expect(explanation).toContain("Code-related");
    });

    it("explains simple flash selection", () => {
      const explanation = router.explain({
        files: [createMockFile()],
        promptTokenEstimate: 10,
      });
      expect(explanation).toContain("Flash");
      expect(explanation).toContain("speed");
    });
  });

  describe("estimateTokens", () => {
    it("estimates ~4 chars per token", () => {
      expect(router.estimateTokens("Hello World!")).toBe(3); // 12 / 4
    });

    it("returns 0 for empty string", () => {
      expect(router.estimateTokens("")).toBe(0);
    });

    it("rounds up partial tokens", () => {
      expect(router.estimateTokens("Hi")).toBe(1); // ceil(2/4)
    });
  });

  describe("containsCodeKeywords", () => {
    it("detects function keyword", () => {
      expect(router.containsCodeKeywords("what does this function do")).toBe(true);
    });

    it("detects class keyword", () => {
      expect(router.containsCodeKeywords("explain this class")).toBe(true);
    });

    it("is case-insensitive", () => {
      expect(router.containsCodeKeywords("REFACTOR this code")).toBe(true);
    });

    it("returns false for non-code prompt", () => {
      expect(router.containsCodeKeywords("what is in this picture")).toBe(false);
    });

    it("detects debug keyword", () => {
      expect(router.containsCodeKeywords("help me debug")).toBe(true);
    });

    it("detects typescript keyword", () => {
      expect(router.containsCodeKeywords("convert this to typescript")).toBe(true);
    });

    it("detects optimize keyword", () => {
      expect(router.containsCodeKeywords("optimize this algorithm")).toBe(true);
    });
  });
});
