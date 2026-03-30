import React from "react";
import { Box, Text } from "ink";

/**
 * Severity levels for analysis sections, per the UI design spec.
 */
export type SectionSeverity = "critical" | "warning" | "info" | "good";

/**
 * A single section in the analysis summary.
 */
export interface AnalysisSection {
  readonly title: string;
  readonly content: string;
  readonly severity?: SectionSeverity;
  readonly items?: ReadonlyArray<string>;
}

/**
 * Props for the AnalysisSummary component.
 */
export interface AnalysisSummaryProps {
  readonly title: string;
  readonly model: string;
  readonly sections: ReadonlyArray<AnalysisSection>;
  readonly metadata?: ReadonlyArray<{ readonly label: string; readonly value: string }>;
}

/**
 * Severity to color mapping.
 */
const SEVERITY_COLOR: Record<SectionSeverity, string> = {
  critical: "red",
  warning: "yellow",
  info: "cyan",
  good: "green",
};

/**
 * Severity badge text for section items.
 */
const SEVERITY_BADGE: Record<SectionSeverity, string> = {
  critical: "[CRITICAL]",
  warning: "[WARNING]",
  info: "[INFO]",
  good: "[GOOD]",
};

/**
 * Section header indicators per the design spec.
 */
const SECTION_INDICATOR: Record<SectionSeverity, string> = {
  critical: "[!!]",
  warning: "[!!]",
  info: "[>>]",
  good: "[OK]",
};

/**
 * Renders a structured analysis summary in the terminal.
 * Displays model info, metadata, severity badges, and organized content sections.
 */
export function AnalysisSummary({
  title,
  model,
  sections,
  metadata,
}: AnalysisSummaryProps): React.ReactElement {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          {title}
        </Text>
      </Box>

      {/* Model info */}
      <Box marginBottom={1}>
        <Text color="gray">Model: </Text>
        <Text>{model}</Text>
      </Box>

      {/* Metadata */}
      {metadata !== undefined && metadata.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          {metadata.map((item) => (
            <Box key={item.label}>
              <Text color="gray">{item.label}: </Text>
              <Text>{item.value}</Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Divider */}
      <Box marginBottom={1}>
        <Text color="gray">{"---"}</Text>
      </Box>

      {/* Sections */}
      {sections.map((section, index) => {
        const severity = section.severity ?? "info";
        const color = SEVERITY_COLOR[severity];
        const indicator = SECTION_INDICATOR[severity];

        return (
          <Box key={section.title} flexDirection="column" marginBottom={index < sections.length - 1 ? 1 : 0}>
            {/* Section header with indicator */}
            <Box>
              <Text bold color={color}>
                {"-- "}
                {section.title}
                {section.items !== undefined ? ` (${section.items.length})` : ""}
                {" "}
              </Text>
              <Text color={color}>{indicator}</Text>
            </Box>

            {/* Section items with severity badges */}
            {section.items !== undefined && section.items.length > 0 ? (
              <Box flexDirection="column" marginLeft={2}>
                {section.items.map((item, itemIndex) => (
                  <Box key={itemIndex}>
                    <Text color={color}>{SEVERITY_BADGE[severity]} </Text>
                    <Text>{item}</Text>
                  </Box>
                ))}
              </Box>
            ) : (
              /* Fallback to plain content */
              <Box marginLeft={2}>
                <Text>{section.content}</Text>
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
