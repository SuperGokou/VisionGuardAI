import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";

/**
 * Processing stages for file operations.
 */
export type ProcessingStage =
  | "resolving"
  | "detecting"
  | "validating"
  | "encoding"
  | "chunking"
  | "building"
  | "sending"
  | "complete"
  | "error";

/**
 * Props for the FileProgress component.
 */
export interface FileProgressProps {
  readonly fileName: string;
  readonly stage: ProcessingStage;
  readonly progress?: number;
  readonly errorMessage?: string;
}

/**
 * Stage display configuration.
 */
const STAGE_CONFIG: Record<ProcessingStage, { label: string; color: string }> = {
  resolving: { label: "Resolving path", color: "cyan" },
  detecting: { label: "Detecting file type", color: "cyan" },
  validating: { label: "Validating file", color: "yellow" },
  encoding: { label: "Encoding to base64", color: "blue" },
  chunking: { label: "Splitting pages", color: "magenta" },
  building: { label: "Building request", color: "blue" },
  sending: { label: "Sending to API", color: "magenta" },
  complete: { label: "Done", color: "green" },
  error: { label: "Failed", color: "red" },
};

/**
 * Terminal UI component showing file processing progress.
 * Displays the current stage with a spinner for active operations.
 */
export function FileProgress({
  fileName,
  stage,
  progress,
  errorMessage,
}: FileProgressProps): React.ReactElement {
  const config = STAGE_CONFIG[stage];
  const isActive = stage !== "complete" && stage !== "error";

  return (
    <Box flexDirection="column" marginBottom={stage === "error" ? 1 : 0}>
      <Box>
        {isActive ? (
          <Box marginRight={1}>
            <Text color="cyan">
              <Spinner type="dots" />
            </Text>
          </Box>
        ) : (
          <Box marginRight={1}>
            <Text color={stage === "complete" ? "green" : "red"}>
              {stage === "complete" ? "[OK]" : "[!!]"}
            </Text>
          </Box>
        )}
        <Text bold>{fileName}</Text>
        <Text color="gray"> - </Text>
        <Text color={config.color}>{config.label}</Text>
        {progress !== undefined && (
          <Text color="gray"> ({Math.round(progress)}%)</Text>
        )}
      </Box>
      {stage === "error" && errorMessage !== undefined && (
        <Box marginLeft={5}>
          <Text color="red">{errorMessage}</Text>
        </Box>
      )}
    </Box>
  );
}

/**
 * Props for the MultiFileProgress component.
 */
export interface MultiFileProgressProps {
  readonly files: ReadonlyArray<FileProgressProps>;
}

/**
 * Shows progress for multiple files being processed.
 */
export function MultiFileProgress({
  files,
}: MultiFileProgressProps): React.ReactElement {
  const completedCount = files.filter((f) => f.stage === "complete").length;
  const errorCount = files.filter((f) => f.stage === "error").length;

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>
          Processing files ({completedCount}/{files.length})
        </Text>
        {errorCount > 0 && (
          <Text color="red"> ({errorCount} failed)</Text>
        )}
      </Box>
      {files.map((file) => (
        <FileProgress key={file.fileName} {...file} />
      ))}
    </Box>
  );
}
