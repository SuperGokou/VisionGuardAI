#!/usr/bin/env node

import { FileProcessor, MultiPartBuilder, ModelRouter } from "@visionguard/core";
import type { FileInput } from "@visionguard/core";
import { extractFileFlags, parseFileFlag } from "./flags/file-flag.js";
import { extractVisionFlag, parseVisionFlag, getVisionPrompt, validateVisionFiles } from "./flags/vision-flag.js";

/**
 * CLI configuration derived from parsed flags.
 */
interface CliConfig {
  readonly files: ReadonlyArray<string>;
  readonly visionMode: ReturnType<typeof parseVisionFlag>;
  readonly prompt: string;
  readonly model?: string;
  readonly help: boolean;
}

const HELP_TEXT = `
VisionGuard AI - Multi-modal Vision & Document Analysis for Gemini CLI

Usage:
  visionguard [options] [prompt]

Options:
  -f, --file <path>      File(s) to analyze (images: PNG, JPG, WebP; documents: PDF)
                          Multiple files: --file a.png --file b.jpg or --file a.png,b.jpg
  -v, --vision [mode]    Vision analysis mode: auto, describe, analyze, code-review, diff
                          Default: auto (when --vision flag is present)
  --model <name>         Force a specific Gemini model (pro or flash)
  -h, --help             Show this help message

Examples:
  visionguard --file screenshot.png "What does this UI show?"
  visionguard --file doc.pdf --vision analyze
  visionguard --file before.png,after.png --vision diff "What changed?"
  visionguard --file code.png --vision code-review
`.trim();

/**
 * Parse all CLI arguments from argv.
 */
function parseArgs(argv: ReadonlyArray<string>): CliConfig {
  const args = argv.slice(2); // Remove node and script path
  const fileRawValues = extractFileFlags(args);
  const visionRaw = extractVisionFlag(args);

  // Collect non-flag arguments as the prompt
  const promptParts: string[] = [];
  let model: string | undefined;
  let help = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }

    if (arg === "--file" || arg === "-f" || arg === "--vision" || arg === "-v") {
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith("-")) {
        i++; // Skip value
      }
      continue;
    }

    if (arg?.startsWith("--file=") || arg?.startsWith("--vision=")) {
      continue;
    }

    if (arg === "--model") {
      model = args[i + 1];
      i++;
      continue;
    }

    if (arg?.startsWith("--model=")) {
      model = arg.slice("--model=".length);
      continue;
    }

    // Everything else is part of the prompt
    if (arg !== undefined && !arg.startsWith("-")) {
      promptParts.push(arg);
    }
  }

  const fileParsed = parseFileFlag(fileRawValues);
  const visionParsed = parseVisionFlag(visionRaw);

  return {
    files: fileParsed.paths,
    visionMode: visionParsed,
    prompt: promptParts.join(" "),
    model,
    help,
  };
}

/**
 * Main CLI entry point.
 */
async function main(): Promise<void> {
  const config = parseArgs(process.argv);

  if (config.help) {
    process.stdout.write(HELP_TEXT + "\n");
    return;
  }

  // Validate vision flag
  if (!config.visionMode.valid && config.visionMode.error !== undefined) {
    process.stderr.write(`Error: ${config.visionMode.error}\n`);
    process.exitCode = 1;
    return;
  }

  // Validate vision + file compatibility
  if (config.visionMode.enabled && config.files.length > 0) {
    const visionValidation = validateVisionFiles(config.files);
    if (!visionValidation.valid) {
      for (const error of visionValidation.errors) {
        process.stderr.write(`Error: ${error}\n`);
      }
      process.exitCode = 1;
      return;
    }
  }

  // Need at least files or a prompt
  if (config.files.length === 0 && config.prompt.length === 0) {
    process.stderr.write("Error: Provide at least a file (--file) or a prompt.\n");
    process.stderr.write("Run with --help for usage information.\n");
    process.exitCode = 1;
    return;
  }

  // Process files
  const processor = new FileProcessor({
    allowedDirectories: [process.cwd()],
  });

  const builder = new MultiPartBuilder();
  const router = new ModelRouter();

  const fileInputs: ReadonlyArray<FileInput> = config.files.map((path) => ({ path }));

  try {
    const processedFiles = await processor.processMany(fileInputs);

    // Build the prompt with vision mode context
    let fullPrompt = config.prompt;
    if (config.visionMode.enabled) {
      const visionPrompt = getVisionPrompt(config.visionMode.mode);
      fullPrompt = fullPrompt.length > 0 ? `${visionPrompt}\n\n${fullPrompt}` : visionPrompt;
    }

    // Build multi-part content
    const content = builder.build(fullPrompt, processedFiles);

    // Select model
    const routingInput = {
      files: processedFiles,
      promptTokenEstimate: router.estimateTokens(fullPrompt),
      explicitModel: config.model,
      promptText: fullPrompt,
    };

    const selectedModel = router.select(routingInput);
    const modelExplanation = router.explain(routingInput);

    // Output the prepared request info
    process.stdout.write(`Model: ${selectedModel} (${modelExplanation})\n`);
    process.stdout.write(`Files: ${processedFiles.length} processed\n`);
    process.stdout.write(`Parts: ${content.parts.length} content parts\n`);
    process.stdout.write(
      `Payload: ~${(builder.estimatePayloadSize(content) / 1024).toFixed(1)} KB\n`,
    );

    // In a full implementation, this would send to the Gemini API
    // For now, output the structured content as JSON
    process.stdout.write(JSON.stringify(content, null, 2) + "\n");
  } catch (error) {
    if (error instanceof Error) {
      process.stderr.write(`Error: ${error.message}\n`);
    } else {
      process.stderr.write("An unexpected error occurred.\n");
    }
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`Fatal: ${error instanceof Error ? error.message : "Unknown error"}\n`);
  process.exitCode = 1;
});
