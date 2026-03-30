# VisionGuard AI -- Terminal UI Design Specification

> Phase 3 design reference for Ink-based terminal UI components.
> Authored by: figma-designer agent | Date: 2026-03-30

---

## FigJam Diagrams (Figma)

| Diagram | Purpose | FigJam Link |
|---------|---------|-------------|
| User Flow | End-to-end CLI input through response rendering | [Open in FigJam](https://www.figma.com/online-whiteboard/create-diagram/0a0cb88f-4d6a-4800-a7be-31f80231ad10?utm_source=claude&utm_content=edit_in_figjam) |
| State Machines | FileProgress, AnalysisSummary, CodeSuggestion states | [Open in FigJam](https://www.figma.com/online-whiteboard/create-diagram/2f143537-8ea1-4e65-b715-e4d5e6ec0f32?utm_source=claude&utm_content=edit_in_figjam) |
| Component Hierarchy | Ink component tree from App root to leaf components | [Open in FigJam](https://www.figma.com/online-whiteboard/create-diagram/f226cb96-1612-443f-957a-af421c38e6a1?utm_source=claude&utm_content=edit_in_figjam) |
| Request Sequence | Interaction sequence: CLI -> FileProcessor -> API -> UI | [Open in FigJam](https://www.figma.com/online-whiteboard/create-diagram/911c0528-b104-4a73-b431-ea65e1701552?utm_source=claude&utm_content=edit_in_figjam) |

---

## 1. Component Specifications

### 1.1 FileProgress

**Purpose:** Displays real-time file processing status during the resolve-detect-encode-send pipeline.

**Props Interface:**

```typescript
interface FileProgressProps {
  readonly files: ReadonlyArray<{
    readonly name: string;
    readonly path: string;
    readonly size: number | null;       // bytes, null until detected
    readonly mimeType: string | null;   // null until detected
    readonly stage: ProcessingStage;
    readonly error: string | null;
  }>;
}

type ProcessingStage =
  | 'resolving'
  | 'detecting'
  | 'encoding'
  | 'sending'
  | 'complete'
  | 'error';
```

**Layout (single file):**

```
+---------------------------------------------------------+
| [*] Resolving path...  screenshot.png                   |
+---------------------------------------------------------+

+---------------------------------------------------------+
| [/] Detecting type...  screenshot.png  (PNG, 245 KB)    |
+---------------------------------------------------------+

+---------------------------------------------------------+
| [-] Encoding...        screenshot.png  (PNG, 245 KB)    |
+---------------------------------------------------------+

+---------------------------------------------------------+
| [\] Sending to Gemini 2.5 Flash...    (PNG, 245 KB)    |
+---------------------------------------------------------+

+---------------------------------------------------------+
| [OK] Complete          screenshot.png  (PNG, 245 KB)    |
+---------------------------------------------------------+

+---------------------------------------------------------+
| [!!] Error: File too large (25 MB > 20 MB limit)       |
+---------------------------------------------------------+
```

**Layout (multi-file):**

```
+---------------------------------------------------------+
| Processing 3 files...                                   |
|                                                         |
|  [OK] screenshot.png    PNG   245 KB   complete         |
|  [-]  api-spec.pdf      PDF   1.2 MB   encoding...     |
|  [ ]  error-log.png     PNG   89 KB    pending          |
|                                                         |
|  [=========>          ] 2/3                              |
+---------------------------------------------------------+
```

**Spinner Animation:** Cycle through `* / - \` at 80ms intervals (matches Ink's built-in `<Spinner>` component).

**Behavior:**
- Appears immediately when `--file` or `--vision` flag is parsed
- Each file progresses independently through stages
- Multi-file: show aggregate progress bar below individual statuses
- Disappears (unmounts) once API streaming response begins
- On error: persists with red error message, halts pipeline for that file

---

### 1.2 AnalysisSummary

**Purpose:** Renders structured analysis output from Gemini vision/document models.

**Props Interface:**

```typescript
interface AnalysisSummaryProps {
  readonly file: {
    readonly name: string;
    readonly mimeType: string;
    readonly size: number;
  };
  readonly model: string;
  readonly sections: ReadonlyArray<AnalysisSection>;
  readonly isStreaming: boolean;
}

interface AnalysisSection {
  readonly title: string;
  readonly severity: 'critical' | 'warning' | 'info' | 'good';
  readonly items: ReadonlyArray<string>;
  readonly collapsed: boolean;
}
```

**Layout:**

```
+-----------------------------------------------------------+
| Analysis: screenshot.png                                  |
| PNG | 245 KB | Gemini 2.5 Flash                           |
+-----------------------------------------------------------+
|                                                           |
| -- Issues Found (3) ------------------------------- [!!] |
|                                                           |
|  [CRITICAL] Button contrast ratio 2.1:1 fails WCAG AA    |
|             Minimum required: 4.5:1                       |
|                                                           |
|  [WARNING]  Nav links lack focus indicators               |
|                                                           |
|  [WARNING]  Image missing alt text attribute              |
|                                                           |
| -- Recommendations -------------------------------- [>>] |
|                                                           |
|  * Increase button background to #1A5276 for 7:1 ratio   |
|  * Add outline: 2px solid on :focus-visible               |
|  * Add descriptive alt="Dashboard overview chart"         |
|                                                           |
| -- Details (collapsed) --------------------------- [vv]  |
|  (Press Enter to expand)                                  |
|                                                           |
+-----------------------------------------------------------+
```

**Section Header Indicators:**
- `[!!]` = has critical/warning items (red/yellow)
- `[>>]` = actionable recommendations (blue)
- `[vv]` = collapsed, press to expand
- `[^^]` = expanded, press to collapse

**Streaming Behavior:**
- Header renders immediately with file metadata
- Sections populate progressively as tokens stream in
- Cursor blinks at end of last rendered line during streaming
- Final layout renders once stream completes

---

### 1.3 CodeSuggestion

**Purpose:** Renders syntax-highlighted code blocks with language labels, line numbers, and diff support.

**Props Interface:**

```typescript
interface CodeSuggestionProps {
  readonly language: string;
  readonly code: string;
  readonly lineNumberStart: number;
  readonly diff: {
    readonly before: string;
    readonly after: string;
  } | null;
  readonly filename: string | null;
}
```

**Layout (standard code block):**

```
+-----------------------------------------------------------+
| css                                         [Copy: Ctrl+C] |
+-----------------------------------------------------------+
|  1 | .cta-button {                                         |
|  2 |   background-color: #1A5276;                          |
|  3 |   color: #FFFFFF;                                     |
|  4 |   padding: 12px 24px;                                 |
|  5 |   border: none;                                       |
|  6 |   border-radius: 4px;                                 |
|  7 |   font-size: 16px;                                    |
|  8 |   cursor: pointer;                                    |
|  9 | }                                                     |
+-----------------------------------------------------------+
```

**Layout (diff view):**

```
+-----------------------------------------------------------+
| css  BEFORE -> AFTER                        [Copy: Ctrl+C] |
+-----------------------------------------------------------+
|  3 | - background-color: #AED6F1;                          |
|  3 | + background-color: #1A5276;                          |
|  5 | - border: 1px solid #ccc;                              |
|  5 | + border: 2px solid #1A5276;                           |
+-----------------------------------------------------------+
```

**Behavior:**
- Language label top-left, copy indicator top-right
- Line numbers right-aligned in gutter, separated by `|`
- Diff lines: `-` prefix in red, `+` prefix in green
- Long lines wrap at terminal width minus gutter width
- If filename provided, show above language label

---

## 2. Color Palette (ANSI Codes)

The palette uses standard ANSI 256 colors to work on both dark and light terminal backgrounds. All colors have been tested against both black (#000) and white (#FFF) backgrounds for readability.

### Semantic Colors

| Role              | ANSI Code    | Hex Approx | Usage                              |
|-------------------|-------------|------------|-------------------------------------|
| Critical/Error    | `\x1b[31m` (Red)        | #E74C3C | Error messages, CRITICAL badges   |
| Warning           | `\x1b[33m` (Yellow)     | #F39C12 | WARNING badges, caution text      |
| Success/Good      | `\x1b[32m` (Green)      | #2ECC71 | OK status, GOOD badges, diff +   |
| Info              | `\x1b[36m` (Cyan)       | #3498DB | INFO badges, metadata, links      |
| Accent            | `\x1b[35m` (Magenta)    | #8E44AD | Model name, highlights            |
| Muted             | `\x1b[90m` (Bright Black)| #7F8C8D | Line numbers, timestamps, dim text|
| Default           | `\x1b[0m`  (Reset)      | -       | Body text                          |
| Bold              | `\x1b[1m`               | -       | Headers, section titles            |

### Ink/Chalk Mapping

```typescript
// Color constants for use with Ink's <Text> component
const COLORS = {
  critical: 'red',
  warning: 'yellow',
  success: 'green',
  info: 'cyan',
  accent: 'magenta',
  muted: 'gray',
  diffAdd: 'green',
  diffRemove: 'red',
} as const;

// Severity to color mapping
const SEVERITY_COLOR: Record<string, string> = {
  critical: 'red',
  warning: 'yellow',
  info: 'cyan',
  good: 'green',
} as const;
```

### Box Drawing Characters

```
Borders:     + - |        (ASCII-safe, widest terminal compat)
Headers:     -- text --   (section dividers)
Progress:    [====>    ]  (progress bar)
Bullets:     *            (list items)
Diff:        + / -        (added/removed lines)
Gutter:      |            (code line number separator)
```

**Rationale:** We use ASCII box-drawing (`+`, `-`, `|`) instead of Unicode (`---`, `|`, etc.) for maximum compatibility across terminal emulators, SSH sessions, and screen readers. Ink's `<Box>` component handles borders natively and can be configured with `borderStyle="single"` or `borderStyle="round"`.

---

## 3. Layout Diagrams

### 3.1 Full Screen Layout (80-column terminal)

```
+-- Terminal (80 cols) ----------------------------------------+
|                                                              |
|  VisionGuard AI                                              |
|  =============                                               |
|                                                              |
|  > gemini --vision screenshot.png "Improve this UI"          |
|                                                              |
|  +-- FileProgress -----------------------------------+       |
|  | [\] Sending to Gemini 2.5 Flash...  (PNG, 245 KB)|       |
|  +---------------------------------------------------+       |
|                                                              |
|  +-- AnalysisSummary --------------------------------+       |
|  | Analysis: screenshot.png                          |       |
|  | PNG | 245 KB | Gemini 2.5 Flash                   |       |
|  |                                                   |       |
|  | -- Issues Found (3) ----------------------- [!!]  |       |
|  |   [CRITICAL] Low contrast on CTA button           |       |
|  |   [WARNING]  Missing focus indicators              |       |
|  |   [WARNING]  No alt text on hero image             |       |
|  |                                                   |       |
|  | -- Recommendations ----------------------- [>>]   |       |
|  |   * Increase contrast to WCAG AA (4.5:1)          |       |
|  |   * Add :focus-visible outlines                    |       |
|  |   * Add descriptive alt attributes                 |       |
|  +---------------------------------------------------+       |
|                                                              |
|  +-- CodeSuggestion ---------------------------------+       |
|  | css                                   [Copy]      |       |
|  |  1 | .cta-button {                                |       |
|  |  2 |   background-color: #1A5276;                 |       |
|  |  3 |   color: #FFFFFF;                            |       |
|  |  4 | }                                            |       |
|  +---------------------------------------------------+       |
|                                                              |
+--------------------------------------------------------------+
```

### 3.2 Narrow Terminal (40-column)

```
+-- Terminal (40 cols) ----------------+
|                                      |
| > gemini --vision img.png "fix"      |
|                                      |
| +-- FileProgress ---------------+    |
| | [-] Encoding...               |    |
| |     img.png (PNG, 245 KB)     |    |
| +-------------------------------+    |
|                                      |
| +-- AnalysisSummary ------------+    |
| | Analysis: img.png             |    |
| | PNG | 245 KB | Flash          |    |
| |                               |    |
| | -- Issues (3) --------- [!!] |    |
| |  [CRITICAL] Low contrast      |    |
| |  [WARNING] No focus style     |    |
| |                               |    |
| | -- Recs --------------- [>>] |    |
| |  * Increase contrast           |    |
| |  * Add focus outlines          |    |
| +-------------------------------+    |
|                                      |
+--------------------------------------+
```

**Responsive Strategy:**
- Ink's `<Box>` flexbox model handles width automatically
- File metadata wraps to second line below 60 columns
- Section headers truncate with ellipsis below 50 columns
- Code blocks enable horizontal scroll indicator below 60 columns
- Line numbers hidden below 40 columns (show code only)

---

## 4. State Machines

### 4.1 FileProgress State Machine

```
                  file path received
    [IDLE] --------------------------> [RESOLVING]
                                           |
                              +------------+------------+
                              |                         |
                         path resolved           sandbox violation
                              |                         |
                              v                         v
                        [DETECTING]                 [ERROR]
                              |
                   +----------+----------+
                   |                     |
              MIME detected        unsupported type
                   |                     |
                   v                     v
              [ENCODING]             [ERROR]
                   |
            +------+------+
            |             |
       encoded OK    file too large
            |             |
            v             v
        [SENDING]     [ERROR]
            |
      +-----+------+
      |            |
   response     timeout
   started         |
      |            v
      v         [ERROR]
  [COMPLETE]

Transitions:
  IDLE -> RESOLVING:    on file path received
  RESOLVING -> DETECTING:  on path resolved successfully
  RESOLVING -> ERROR:      on SANDBOX_VIOLATION | FILE_NOT_FOUND
  DETECTING -> ENCODING:   on supported MIME detected
  DETECTING -> ERROR:      on UNSUPPORTED_TYPE | MIME_MISMATCH
  ENCODING -> SENDING:     on base64 encoding complete
  ENCODING -> ERROR:       on FILE_TOO_LARGE | ENCODING_FAILED
  SENDING -> COMPLETE:     on first API response chunk received
  SENDING -> ERROR:        on API timeout | network error
  ERROR -> (terminal):     display error, halt this file
  COMPLETE -> (unmount):   component removed from render tree
```

### 4.2 AnalysisSummary State Machine

```
  [LOADING] -------> [STREAMING_HEADER] -------> [STREAMING_BODY]
      |                                                |
      |  (parse error)                                 v
      +--------------> [FALLBACK_TEXT]          [RENDERING_SECTIONS]
                              |                        |
                              v                        v
                         [RENDERED] <-----------  [RENDERED]

Transitions:
  LOADING -> STREAMING_HEADER:   on first response chunk with file metadata
  LOADING -> FALLBACK_TEXT:      on response that does not match structured format
  STREAMING_HEADER -> STREAMING_BODY:  on header section complete (model + file info parsed)
  STREAMING_BODY -> RENDERING_SECTIONS: on stream end signal
  RENDERING_SECTIONS -> RENDERED:  on all sections laid out with severity badges
  FALLBACK_TEXT -> RENDERED:       on plain text fully rendered
```

### 4.3 CodeSuggestion State Machine

```
  [SCANNING] -------> [CODE_BLOCK_FOUND] -------> [HIGHLIGHTING]
      |                                                 |
      |  (stream ends, no code)                         v
      +--------------> [NO_CODE]                  [DISPLAYED]
                           |                           |
                           v                           v
                       (unmount)                   (persist)

Transitions:
  SCANNING -> CODE_BLOCK_FOUND:  on ``` fence detected in stream
  SCANNING -> NO_CODE:           on stream end without code fences
  CODE_BLOCK_FOUND -> HIGHLIGHTING: on language identifier parsed
  HIGHLIGHTING -> DISPLAYED:     on syntax coloring applied
  NO_CODE -> (unmount):          component not rendered
  DISPLAYED -> (persist):        remains visible in final output
```

---

## 5. Accessibility

### Screen Reader Support

- All status text is plain ASCII (no decorative Unicode that screen readers mangle)
- Severity badges use text labels `[CRITICAL]`, `[WARNING]`, `[INFO]`, `[GOOD]` -- not color alone
- Progress stages announced as text: "Resolving path...", "Detecting file type..."
- Code blocks include language label as first line for context
- Section collapse/expand state indicated by text `(collapsed)` / `(expanded)`

### Color Independence

Every piece of information conveyed by color is also conveyed by text:
- Error state: red color AND `[!!]` indicator AND "Error:" prefix
- Warning: yellow color AND `[WARNING]` badge
- Success: green color AND `[OK]` indicator
- Diff additions: green AND `+` prefix
- Diff removals: red AND `-` prefix

### Keyboard Navigation

| Key       | Action                                      |
|-----------|---------------------------------------------|
| Enter     | Expand/collapse section                     |
| Tab       | Move focus to next interactive element      |
| q         | Quit / dismiss current view                 |
| c         | Copy code block to clipboard                |

---

## 6. Design Rationale

### Why ASCII box drawing over Unicode?

Unicode box-drawing characters (single-line, double-line, rounded) look elegant but break in:
- Windows cmd.exe with non-UTF-8 codepages
- SSH sessions with misconfigured locale
- Some screen readers that read each character individually
- Pipe/redirect scenarios (`gemini --file x.png | less`)

Ink's `<Box borderStyle="single">` uses Unicode internally but degrades gracefully. Our custom layouts use ASCII `+`, `-`, `|` as fallback.

### Why progressive section rendering?

Vision model responses can be long (1000+ tokens). Showing a blank screen until completion feels slow. Progressive rendering:
1. Shows the header immediately (user confirms correct file)
2. Streams section content as it arrives
3. Applies severity badges post-stream (requires full section text)
4. Finalizes layout after stream ends

### Why collapsible sections?

PDF analysis can produce 50+ findings. Without collapse:
- Terminal scrollback fills up quickly
- Users lose context scrolling through low-severity items
- Critical items get buried

Default state: Issues expanded, Recommendations expanded, Details collapsed.

### Why diff view in CodeSuggestion?

Vision-to-code is the primary use case. When Gemini suggests CSS changes to fix a UI issue, showing before/after diff is more actionable than just the final code. The diff format matches `git diff` conventions users already know.

### Model routing indicator

Showing "Using Gemini 2.5 Flash for quick analysis..." serves two purposes:
1. Transparency: user knows which model was selected and why
2. Expectation setting: Flash = faster/cheaper, Pro = deeper analysis
3. Override prompt: reminds user they can use `--model pro` if needed

---

## 7. Ink Component Implementation Notes

### Dependencies (existing in gemini-cli)

- `ink` -- React renderer for terminal
- `ink-spinner` -- animated spinner component
- `chalk` -- terminal string styling (Ink uses this internally)

### Dependencies (may need to add)

- `ink-syntax-highlight` or `cli-highlight` -- code syntax highlighting
  - **Justification:** No existing syntax highlighter in the project; hand-rolling one is out of scope
  - **Alternative:** Use chalk-based manual coloring for a small set of languages (CSS, JS, HTML, Python)

### Component File Structure

```
packages/ui/src/components/
  FileProgress.tsx          # Main file progress component
  FileProgressItem.tsx      # Single file progress row (extracted for reuse in multi-file)
  AnalysisSummary.tsx       # Main analysis output component
  AnalysisSection.tsx       # Single collapsible section
  SeverityBadge.tsx         # [CRITICAL] / [WARNING] / [INFO] / [GOOD] badge
  CodeSuggestion.tsx        # Code block with syntax highlighting
  DiffView.tsx              # Before/after diff renderer
  LineNumbers.tsx           # Line number gutter component
  __tests__/
    FileProgress.test.tsx
    AnalysisSummary.test.tsx
    CodeSuggestion.test.tsx
```

### Shared Constants

```typescript
// packages/ui/src/constants.ts

export const SPINNER_INTERVAL_MS = 80;

export const STAGE_LABELS: Record<ProcessingStage, string> = {
  resolving: 'Resolving path...',
  detecting: 'Detecting type...',
  encoding: 'Encoding...',
  sending: 'Sending to',
  complete: 'Complete',
  error: 'Error',
} as const;

export const MAX_SECTION_ITEMS_BEFORE_COLLAPSE = 10;
export const MIN_TERMINAL_WIDTH_FOR_LINE_NUMBERS = 40;
export const MIN_TERMINAL_WIDTH_FOR_FULL_METADATA = 60;
```

---

## 8. Test Plan for UI Components

| Test Case | Component | Assertion |
|-----------|-----------|-----------|
| Single file resolving stage | FileProgress | Renders spinner + "Resolving path..." + filename |
| Single file complete stage | FileProgress | Renders [OK] + filename + size |
| Single file error stage | FileProgress | Renders [!!] + error message in red |
| Multi-file mixed stages | FileProgress | Renders each file with correct stage, shows progress bar |
| Structured analysis render | AnalysisSummary | Renders header, sections with severity badges |
| Streaming partial render | AnalysisSummary | Renders available sections, shows cursor on last |
| Fallback plain text | AnalysisSummary | Renders raw text when response is unstructured |
| Collapsed section | AnalysisSummary | Shows "(collapsed)" indicator, hides items |
| Code block with language | CodeSuggestion | Renders language label, line numbers, highlighted code |
| Diff view | CodeSuggestion | Renders - lines in red, + lines in green |
| Narrow terminal | All | Components degrade gracefully below 40 columns |
| Empty response | AnalysisSummary | Shows "No analysis results" message |

---

## Appendix: Terminal Width Breakpoints

| Width    | Layout Behavior |
|----------|----------------|
| 80+ cols | Full layout: all metadata, line numbers, full section headers |
| 60-79    | Compact metadata (model name abbreviated), full code |
| 40-59    | Metadata wraps, section headers truncated, code without line numbers |
| < 40     | Minimal: filename only, no badges, code-only without gutter |
