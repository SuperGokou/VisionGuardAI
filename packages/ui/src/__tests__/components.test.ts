import { describe, it, expect } from "vitest";

/**
 * UI component tests.
 *
 * Note: Full Ink component testing requires ink-testing-library and a React
 * testing environment. These tests validate the component API contracts
 * and exported types. Full render tests will run in e2e.
 */

describe("UI Components - API contracts", () => {
  describe("FileProgress", () => {
    it("should export FileProgress component", async () => {
      const mod = await import("../components/FileProgress.js");
      expect(mod.FileProgress).toBeDefined();
      expect(typeof mod.FileProgress).toBe("function");
    });

    it("should export MultiFileProgress component", async () => {
      const mod = await import("../components/FileProgress.js");
      expect(mod.MultiFileProgress).toBeDefined();
      expect(typeof mod.MultiFileProgress).toBe("function");
    });
  });

  describe("AnalysisSummary", () => {
    it("should export AnalysisSummary component", async () => {
      const mod = await import("../components/AnalysisSummary.js");
      expect(mod.AnalysisSummary).toBeDefined();
      expect(typeof mod.AnalysisSummary).toBe("function");
    });
  });

  describe("CodeSuggestion", () => {
    it("should export CodeSuggestion component", async () => {
      const mod = await import("../components/CodeSuggestion.js");
      expect(mod.CodeSuggestion).toBeDefined();
      expect(typeof mod.CodeSuggestion).toBe("function");
    });
  });

  describe("Index barrel exports", () => {
    it("should re-export all components from index", async () => {
      const mod = await import("../index.js");
      expect(mod.FileProgress).toBeDefined();
      expect(mod.MultiFileProgress).toBeDefined();
      expect(mod.AnalysisSummary).toBeDefined();
      expect(mod.CodeSuggestion).toBeDefined();
    });
  });
});
