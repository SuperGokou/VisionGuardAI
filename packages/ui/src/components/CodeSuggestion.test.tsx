import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "ink-testing-library";
import { CodeSuggestion } from "./CodeSuggestion.js";

describe("CodeSuggestion", () => {
  it("renders code content", () => {
    const { lastFrame } = render(
      <CodeSuggestion language="ts" code="const x = 1;" />,
    );
    expect(lastFrame()).toContain("const x = 1;");
  });

  it("renders language label from short name", () => {
    const { lastFrame } = render(
      <CodeSuggestion language="ts" code="const x = 1;" />,
    );
    expect(lastFrame()).toContain("TypeScript");
  });

  it("renders language label from full name", () => {
    const { lastFrame } = render(
      <CodeSuggestion language="python" code="x = 1" />,
    );
    expect(lastFrame()).toContain("Python");
  });

  it("falls back to raw language name for unknown languages", () => {
    const { lastFrame } = render(
      <CodeSuggestion language="haskell" code="x = 1" />,
    );
    expect(lastFrame()).toContain("haskell");
  });

  it("renders line numbers by default", () => {
    const code = ["line1", "line2", "line3"].join("\n");
    const { lastFrame } = render(
      <CodeSuggestion language="js" code={code} />,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain("1 |");
    expect(frame).toContain("line1");
  });

  it("hides line numbers when lineNumbers is false", () => {
    const { lastFrame } = render(
      <CodeSuggestion language="js" code="const x = 1;" lineNumbers={false} />,
    );
    const frame = lastFrame() ?? "";
    expect(frame).not.toContain("1 |");
  });

  it("renders title when provided", () => {
    const { lastFrame } = render(
      <CodeSuggestion
        language="ts"
        code="const x = 1;"
        title="Suggested Fix"
      />,
    );
    expect(lastFrame()).toContain("Suggested Fix");
  });

  it("renders description when provided", () => {
    const { lastFrame } = render(
      <CodeSuggestion
        language="ts"
        code="const x = 1;"
        description="Replace the existing line with this"
      />,
    );
    expect(lastFrame()).toContain("Replace the existing line with this");
  });

  it("renders multi-line code correctly", () => {
    const code = `function add(a: number, b: number): number {
  return a + b;
}`;
    const { lastFrame } = render(
      <CodeSuggestion language="ts" code={code} />,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain("function add");
    expect(frame).toContain("return a + b");
  });

  it("renders code block delimiters", () => {
    const { lastFrame } = render(
      <CodeSuggestion language="go" code="fmt.Println()" />,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain("---");
    expect(frame).toContain("Go");
  });

  it("is case-insensitive for language lookup", () => {
    const { lastFrame } = render(
      <CodeSuggestion language="JSON" code="{}" />,
    );
    expect(lastFrame()).toContain("JSON");
  });

  it("handles known language aliases", () => {
    const aliases: Array<[string, string]> = [
      ["js", "JavaScript"],
      ["javascript", "JavaScript"],
      ["ts", "TypeScript"],
      ["typescript", "TypeScript"],
      ["py", "Python"],
      ["python", "Python"],
      ["sh", "Shell"],
      ["bash", "Bash"],
    ];

    for (const [alias, expected] of aliases) {
      const { lastFrame } = render(
        <CodeSuggestion language={alias} code="x" />,
      );
      expect(lastFrame()).toContain(expected);
    }
  });

  it("handles empty code string", () => {
    const { lastFrame } = render(
      <CodeSuggestion language="ts" code="" />,
    );
    expect(lastFrame()).toContain("TypeScript");
  });

  it("pads line numbers for alignment", () => {
    const lines = Array.from({ length: 12 }, (_, i) => `line${i + 1}`);
    const { lastFrame } = render(
      <CodeSuggestion language="ts" code={lines.join("\n")} />,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain(" 1 |");
    expect(frame).toContain("12 |");
  });

  // New features from design spec

  it("renders filename when provided", () => {
    const { lastFrame } = render(
      <CodeSuggestion
        language="css"
        code=".btn { color: red; }"
        filename="styles.css"
      />,
    );
    expect(lastFrame()).toContain("styles.css");
  });

  it("renders line numbers starting from lineNumberStart", () => {
    const code = ["line A", "line B"].join("\n");
    const { lastFrame } = render(
      <CodeSuggestion language="ts" code={code} lineNumberStart={10} />,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain("10 |");
    expect(frame).toContain("11 |");
  });

  it("renders diff view when diff prop is provided", () => {
    const { lastFrame } = render(
      <CodeSuggestion
        language="css"
        code=""
        diff={{
          before: "background-color: #AED6F1;",
          after: "background-color: #1A5276;",
        }}
      />,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain("BEFORE -> AFTER");
    expect(frame).toContain("#AED6F1");
    expect(frame).toContain("#1A5276");
  });

  it("renders diff with - prefix for removed lines", () => {
    const { lastFrame } = render(
      <CodeSuggestion
        language="css"
        code=""
        diff={{
          before: "old-value",
          after: "new-value",
        }}
      />,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain("- old-value");
    expect(frame).toContain("+ new-value");
  });

  it("renders diff with context lines for unchanged lines", () => {
    const { lastFrame } = render(
      <CodeSuggestion
        language="css"
        code=""
        diff={{
          before: "same line\nold line",
          after: "same line\nnew line",
        }}
      />,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain("same line");
    expect(frame).toContain("- old line");
    expect(frame).toContain("+ new line");
  });

  it("renders diff with filename when provided", () => {
    const { lastFrame } = render(
      <CodeSuggestion
        language="css"
        code=""
        filename="button.css"
        diff={{
          before: "a",
          after: "b",
        }}
      />,
    );
    expect(lastFrame()).toContain("button.css");
  });

  it("renders diff with title when provided", () => {
    const { lastFrame } = render(
      <CodeSuggestion
        language="css"
        code=""
        title="Fix contrast ratio"
        diff={{
          before: "a",
          after: "b",
        }}
      />,
    );
    expect(lastFrame()).toContain("Fix contrast ratio");
  });
});
