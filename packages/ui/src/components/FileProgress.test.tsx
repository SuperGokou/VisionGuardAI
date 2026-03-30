import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "ink-testing-library";
import { FileProgress, MultiFileProgress } from "./FileProgress.js";
import type { ProcessingStage, FileProgressProps } from "./FileProgress.js";

describe("FileProgress", () => {
  it("renders file name", () => {
    const { lastFrame } = render(
      <FileProgress fileName="test.png" stage="resolving" />,
    );
    expect(lastFrame()).toContain("test.png");
  });

  it("renders spinner for active stages", () => {
    const activeStages: ProcessingStage[] = [
      "resolving",
      "detecting",
      "validating",
      "encoding",
      "chunking",
      "building",
      "sending",
    ];
    for (const stage of activeStages) {
      const { lastFrame } = render(
        <FileProgress fileName="test.png" stage={stage} />,
      );
      // Active stages should NOT show [OK] or [!!]
      expect(lastFrame()).not.toContain("[OK]");
      expect(lastFrame()).not.toContain("[!!]");
    }
  });

  it("renders [OK] for complete stage", () => {
    const { lastFrame } = render(
      <FileProgress fileName="test.png" stage="complete" />,
    );
    expect(lastFrame()).toContain("[OK]");
    expect(lastFrame()).toContain("Done");
  });

  it("renders [!!] for error stage", () => {
    const { lastFrame } = render(
      <FileProgress fileName="test.png" stage="error" errorMessage="Oops" />,
    );
    expect(lastFrame()).toContain("[!!]");
    expect(lastFrame()).toContain("Failed");
  });

  it("renders error message when stage is error", () => {
    const { lastFrame } = render(
      <FileProgress
        fileName="test.png"
        stage="error"
        errorMessage="File not found"
      />,
    );
    expect(lastFrame()).toContain("File not found");
  });

  it("renders progress percentage when provided", () => {
    const { lastFrame } = render(
      <FileProgress fileName="test.png" stage="encoding" progress={75} />,
    );
    expect(lastFrame()).toContain("75%");
  });

  it("renders sending stage", () => {
    const { lastFrame } = render(
      <FileProgress fileName="test.png" stage="sending" />,
    );
    expect(lastFrame()).toContain("Sending to API");
  });

  it("renders stage label for each stage", () => {
    const stageLabels: Record<ProcessingStage, string> = {
      resolving: "Resolving path",
      detecting: "Detecting file type",
      validating: "Validating file",
      encoding: "Encoding to base64",
      chunking: "Splitting pages",
      building: "Building request",
      sending: "Sending to API",
      complete: "Done",
      error: "Failed",
    };

    for (const [stage, label] of Object.entries(stageLabels)) {
      const { lastFrame } = render(
        <FileProgress fileName="test.png" stage={stage as ProcessingStage} />,
      );
      expect(lastFrame()).toContain(label);
    }
  });
});

describe("MultiFileProgress", () => {
  it("renders file count", () => {
    const files: FileProgressProps[] = [
      { fileName: "a.png", stage: "complete" },
      { fileName: "b.jpg", stage: "encoding" },
    ];
    const { lastFrame } = render(<MultiFileProgress files={files} />);
    expect(lastFrame()).toContain("1/2");
  });

  it("renders all file names", () => {
    const files: FileProgressProps[] = [
      { fileName: "first.png", stage: "resolving" },
      { fileName: "second.jpg", stage: "detecting" },
    ];
    const { lastFrame } = render(<MultiFileProgress files={files} />);
    expect(lastFrame()).toContain("first.png");
    expect(lastFrame()).toContain("second.jpg");
  });

  it("shows error count when files have errors", () => {
    const files: FileProgressProps[] = [
      { fileName: "good.png", stage: "complete" },
      { fileName: "bad.png", stage: "error", errorMessage: "fail" },
    ];
    const { lastFrame } = render(<MultiFileProgress files={files} />);
    expect(lastFrame()).toContain("1 failed");
  });

  it("does not show error count when no errors", () => {
    const files: FileProgressProps[] = [
      { fileName: "a.png", stage: "complete" },
      { fileName: "b.png", stage: "complete" },
    ];
    const { lastFrame } = render(<MultiFileProgress files={files} />);
    expect(lastFrame()).not.toContain("failed");
  });
});
