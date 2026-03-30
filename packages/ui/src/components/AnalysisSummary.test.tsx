import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "ink-testing-library";
import { AnalysisSummary } from "./AnalysisSummary.js";
import type { AnalysisSection } from "./AnalysisSummary.js";

describe("AnalysisSummary", () => {
  const defaultSections: AnalysisSection[] = [
    { title: "Overview", content: "A test summary", severity: "info" },
  ];

  it("renders the title", () => {
    const { lastFrame } = render(
      <AnalysisSummary
        title="Test Analysis"
        model="gemini-2.5-pro"
        sections={defaultSections}
      />,
    );
    expect(lastFrame()).toContain("Test Analysis");
  });

  it("renders the model name", () => {
    const { lastFrame } = render(
      <AnalysisSummary
        title="Analysis"
        model="gemini-2.5-flash"
        sections={defaultSections}
      />,
    );
    expect(lastFrame()).toContain("gemini-2.5-flash");
  });

  it("renders section titles", () => {
    const sections: AnalysisSection[] = [
      { title: "First Section", content: "Content 1" },
      { title: "Second Section", content: "Content 2" },
    ];
    const { lastFrame } = render(
      <AnalysisSummary
        title="Analysis"
        model="pro"
        sections={sections}
      />,
    );
    expect(lastFrame()).toContain("First Section");
    expect(lastFrame()).toContain("Second Section");
  });

  it("renders section content as fallback when no items", () => {
    const sections: AnalysisSection[] = [
      { title: "Details", content: "This is the content body" },
    ];
    const { lastFrame } = render(
      <AnalysisSummary
        title="Analysis"
        model="pro"
        sections={sections}
      />,
    );
    expect(lastFrame()).toContain("This is the content body");
  });

  it("renders metadata when provided", () => {
    const { lastFrame } = render(
      <AnalysisSummary
        title="Analysis"
        model="pro"
        sections={defaultSections}
        metadata={[
          { label: "File", value: "image.png" },
          { label: "Size", value: "1.2 MB" },
        ]}
      />,
    );
    expect(lastFrame()).toContain("File");
    expect(lastFrame()).toContain("image.png");
    expect(lastFrame()).toContain("Size");
    expect(lastFrame()).toContain("1.2 MB");
  });

  it("renders without metadata", () => {
    const { lastFrame } = render(
      <AnalysisSummary
        title="Analysis"
        model="pro"
        sections={defaultSections}
      />,
    );
    expect(lastFrame()).toContain("Analysis");
  });

  it("renders severity badges for section items", () => {
    const sections: AnalysisSection[] = [
      {
        title: "Issues",
        content: "",
        severity: "critical",
        items: ["Low contrast on button", "Missing alt text"],
      },
    ];
    const { lastFrame } = render(
      <AnalysisSummary
        title="Analysis"
        model="pro"
        sections={sections}
      />,
    );
    expect(lastFrame()).toContain("[CRITICAL]");
    expect(lastFrame()).toContain("Low contrast on button");
    expect(lastFrame()).toContain("Missing alt text");
  });

  it("renders warning severity badges", () => {
    const sections: AnalysisSection[] = [
      {
        title: "Warnings",
        content: "",
        severity: "warning",
        items: ["Deprecated API usage"],
      },
    ];
    const { lastFrame } = render(
      <AnalysisSummary
        title="Analysis"
        model="pro"
        sections={sections}
      />,
    );
    expect(lastFrame()).toContain("[WARNING]");
  });

  it("renders good severity badges", () => {
    const sections: AnalysisSection[] = [
      {
        title: "Passing",
        content: "",
        severity: "good",
        items: ["All tests pass"],
      },
    ];
    const { lastFrame } = render(
      <AnalysisSummary
        title="Analysis"
        model="pro"
        sections={sections}
      />,
    );
    expect(lastFrame()).toContain("[GOOD]");
  });

  it("renders info severity badges", () => {
    const sections: AnalysisSection[] = [
      {
        title: "Notes",
        content: "",
        severity: "info",
        items: ["Uses React 18"],
      },
    ];
    const { lastFrame } = render(
      <AnalysisSummary
        title="Analysis"
        model="pro"
        sections={sections}
      />,
    );
    expect(lastFrame()).toContain("[INFO]");
  });

  it("renders section item count in header", () => {
    const sections: AnalysisSection[] = [
      {
        title: "Issues Found",
        content: "",
        severity: "critical",
        items: ["Issue 1", "Issue 2", "Issue 3"],
      },
    ];
    const { lastFrame } = render(
      <AnalysisSummary
        title="Analysis"
        model="pro"
        sections={sections}
      />,
    );
    expect(lastFrame()).toContain("Issues Found (3)");
  });

  it("renders section indicator [!!] for critical/warning", () => {
    const sections: AnalysisSection[] = [
      { title: "Errors", content: "Bad", severity: "critical" },
    ];
    const { lastFrame } = render(
      <AnalysisSummary
        title="Analysis"
        model="pro"
        sections={sections}
      />,
    );
    expect(lastFrame()).toContain("[!!]");
  });

  it("renders section indicator [>>] for info", () => {
    const sections: AnalysisSection[] = [
      { title: "Recommendations", content: "Do this", severity: "info" },
    ];
    const { lastFrame } = render(
      <AnalysisSummary
        title="Analysis"
        model="pro"
        sections={sections}
      />,
    );
    expect(lastFrame()).toContain("[>>]");
  });

  it("renders section indicator [OK] for good", () => {
    const sections: AnalysisSection[] = [
      { title: "Passing", content: "All good", severity: "good" },
    ];
    const { lastFrame } = render(
      <AnalysisSummary
        title="Analysis"
        model="pro"
        sections={sections}
      />,
    );
    expect(lastFrame()).toContain("[OK]");
  });

  it("renders divider between metadata and sections", () => {
    const { lastFrame } = render(
      <AnalysisSummary
        title="Analysis"
        model="pro"
        sections={defaultSections}
      />,
    );
    expect(lastFrame()).toContain("---");
  });

  it("renders multiple sections in order", () => {
    const sections: AnalysisSection[] = [
      { title: "First", content: "A" },
      { title: "Second", content: "B" },
      { title: "Third", content: "C" },
    ];
    const { lastFrame } = render(
      <AnalysisSummary
        title="Analysis"
        model="pro"
        sections={sections}
      />,
    );
    const frame = lastFrame() ?? "";
    const firstIdx = frame.indexOf("First");
    const secondIdx = frame.indexOf("Second");
    const thirdIdx = frame.indexOf("Third");
    expect(firstIdx).toBeLessThan(secondIdx);
    expect(secondIdx).toBeLessThan(thirdIdx);
  });

  it("defaults severity to info when not specified", () => {
    const sections: AnalysisSection[] = [
      { title: "Notes", content: "Some info" },
    ];
    const { lastFrame } = render(
      <AnalysisSummary
        title="Analysis"
        model="pro"
        sections={sections}
      />,
    );
    // Should render with info indicator [>>]
    expect(lastFrame()).toContain("[>>]");
  });
});
