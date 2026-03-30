import React from "react";
import { Box, Text } from "ink";

/**
 * Diff content for before/after code comparison.
 */
export interface DiffContent {
  readonly before: string;
  readonly after: string;
}

/**
 * Props for the CodeSuggestion component.
 */
export interface CodeSuggestionProps {
  readonly language: string;
  readonly code: string;
  readonly title?: string;
  readonly description?: string;
  readonly lineNumbers?: boolean;
  readonly lineNumberStart?: number;
  readonly filename?: string;
  readonly diff?: DiffContent;
}

/**
 * Language display names for common languages.
 */
const LANGUAGE_LABELS: Record<string, string> = {
  ts: "TypeScript",
  typescript: "TypeScript",
  js: "JavaScript",
  javascript: "JavaScript",
  py: "Python",
  python: "Python",
  go: "Go",
  rust: "Rust",
  java: "Java",
  json: "JSON",
  yaml: "YAML",
  html: "HTML",
  css: "CSS",
  sh: "Shell",
  bash: "Bash",
  sql: "SQL",
  md: "Markdown",
};

/**
 * Renders a syntax-highlighted code block in the terminal.
 * Supports line numbers, language labels, diff view, and filename display.
 */
export function CodeSuggestion({
  language,
  code,
  title,
  description,
  lineNumbers = true,
  lineNumberStart = 1,
  filename,
  diff,
}: CodeSuggestionProps): React.ReactElement {
  const langLabel = LANGUAGE_LABELS[language.toLowerCase()] ?? language;

  // If diff is provided, render diff view instead
  if (diff !== undefined) {
    return (
      <DiffView
        langLabel={langLabel}
        diff={diff}
        title={title}
        description={description}
        filename={filename}
      />
    );
  }

  const lines = code.split("\n");
  const maxLineNum = lineNumberStart + lines.length - 1;
  const lineNumWidth = String(maxLineNum).length;

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Title */}
      {title !== undefined && (
        <Box marginBottom={0}>
          <Text bold>{title}</Text>
        </Box>
      )}

      {/* Description */}
      {description !== undefined && (
        <Box marginBottom={0}>
          <Text color="gray">{description}</Text>
        </Box>
      )}

      {/* Code block header */}
      <Box>
        <Text color="gray" dimColor>
          {"--- "}
          {langLabel}
          {filename !== undefined ? `  ${filename}` : ""}
          {" ---"}
        </Text>
      </Box>

      {/* Code lines */}
      <Box flexDirection="column" paddingX={1}>
        {lines.map((line, index) => (
          <Box key={index}>
            {lineNumbers && (
              <Box width={lineNumWidth + 2}>
                <Text color="gray" dimColor>
                  {String(lineNumberStart + index).padStart(lineNumWidth, " ")}
                  {" |"}
                </Text>
              </Box>
            )}
            <Text> {line}</Text>
          </Box>
        ))}
      </Box>

      {/* Code block footer */}
      <Box>
        <Text color="gray" dimColor>
          {"---"}
        </Text>
      </Box>
    </Box>
  );
}

/**
 * Internal props for the DiffView sub-component.
 */
interface DiffViewProps {
  readonly langLabel: string;
  readonly diff: DiffContent;
  readonly title?: string;
  readonly description?: string;
  readonly filename?: string;
}

/**
 * Renders a before/after diff view with red (-) and green (+) lines.
 */
function DiffView({
  langLabel,
  diff,
  title,
  description,
  filename,
}: DiffViewProps): React.ReactElement {
  const beforeLines = diff.before.split("\n");
  const afterLines = diff.after.split("\n");

  // Build diff pairs: match lines by index, show changes
  const diffLines: ReadonlyArray<{
    readonly lineNum: number;
    readonly type: "remove" | "add" | "context";
    readonly text: string;
  }> = buildDiffLines(beforeLines, afterLines);

  const maxLineNum = diffLines.length > 0
    ? Math.max(...diffLines.map((d) => d.lineNum))
    : 1;
  const lineNumWidth = String(maxLineNum).length;

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Title */}
      {title !== undefined && (
        <Box marginBottom={0}>
          <Text bold>{title}</Text>
        </Box>
      )}

      {/* Description */}
      {description !== undefined && (
        <Box marginBottom={0}>
          <Text color="gray">{description}</Text>
        </Box>
      )}

      {/* Diff header */}
      <Box>
        <Text color="gray" dimColor>
          {"--- "}
          {langLabel}
          {"  BEFORE -> AFTER"}
          {filename !== undefined ? `  ${filename}` : ""}
          {" ---"}
        </Text>
      </Box>

      {/* Diff lines */}
      <Box flexDirection="column" paddingX={1}>
        {diffLines.map((line, index) => {
          const prefix = line.type === "remove" ? "- " : line.type === "add" ? "+ " : "  ";
          const color = line.type === "remove" ? "red" : line.type === "add" ? "green" : undefined;

          return (
            <Box key={index}>
              <Box width={lineNumWidth + 2}>
                <Text color="gray" dimColor>
                  {String(line.lineNum).padStart(lineNumWidth, " ")}
                  {" |"}
                </Text>
              </Box>
              <Text color={color}>
                {" "}
                {prefix}
                {line.text}
              </Text>
            </Box>
          );
        })}
      </Box>

      {/* Footer */}
      <Box>
        <Text color="gray" dimColor>
          {"---"}
        </Text>
      </Box>
    </Box>
  );
}

/**
 * Build a simple line-by-line diff from before and after arrays.
 * Shows removed lines (-), added lines (+), and matching context lines.
 */
function buildDiffLines(
  before: ReadonlyArray<string>,
  after: ReadonlyArray<string>,
): ReadonlyArray<{ lineNum: number; type: "remove" | "add" | "context"; text: string }> {
  const result: Array<{ lineNum: number; type: "remove" | "add" | "context"; text: string }> = [];
  const maxLen = Math.max(before.length, after.length);

  for (let i = 0; i < maxLen; i++) {
    const beforeLine = i < before.length ? before[i] : undefined;
    const afterLine = i < after.length ? after[i] : undefined;
    const lineNum = i + 1;

    if (beforeLine === afterLine) {
      // Context line - unchanged
      if (beforeLine !== undefined) {
        result.push({ lineNum, type: "context", text: beforeLine });
      }
    } else {
      // Changed line - show removal then addition
      if (beforeLine !== undefined) {
        result.push({ lineNum, type: "remove", text: beforeLine });
      }
      if (afterLine !== undefined) {
        result.push({ lineNum, type: "add", text: afterLine });
      }
    }
  }

  return result;
}
