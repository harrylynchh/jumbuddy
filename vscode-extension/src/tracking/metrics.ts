import {
  FlushMetrics,
  ThrashResult,
  ErrorChurnResult,
  DeleteRewriteResult,
} from "../utils/types";

/**
 * Compute all flush metrics from diff and context.
 *
 * @param diffs - unified diff string
 * @param oldContent - mirror content (before)
 * @param newContent - current editor buffer (after)
 * @param startTimestamp - ISO 8601 flush window start
 * @param endTimestamp - ISO 8601 flush window end
 * @param cursorReads - symbol visit counts from cursor tracking
 */
export function computeMetrics(
  diffs: string,
  oldContent: string,
  newContent: string,
  startTimestamp: string,
  endTimestamp: string,
  cursorReads: Map<string, number>,
): FlushMetrics {
  const inserted = charsInserted(diffs);
  const deleted = charsDeleted(diffs);
  const ratio = rewriteRatio(inserted, deleted);
  const windowSecs = windowDurationSeconds(startTimestamp, endTimestamp);
  const touched = linesTouched(diffs);

  return {
    chars_inserted: inserted,
    chars_deleted: deleted,
    rewrite_ratio: ratio,
    edit_velocity: editVelocity(inserted, deleted, windowSecs),
    lines_touched: touched,
    thrash: thrash(diffs, touched),
    error_churn: errorChurn(oldContent, newContent),
    delete_rewrite: deleteRewrite(inserted, deleted, ratio),
    cursor_reads: cursorReadsToObject(cursorReads),
  };
}

/**
 * Sum of characters on added (`+`) lines in diff hunks.
 * Excludes hunk headers (`@@`), and `---`/`+++` file headers.
 */
function charsInserted(diffs: string): number {
  let count = 0;
  for (const line of diffs.split("\n")) {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      count += line.length - 1; // exclude the leading '+'
    }
  }
  return count;
}

/**
 * Sum of characters on removed (`-`) lines in diff hunks.
 * Excludes hunk headers (`@@`), and `---`/`+++` file headers.
 */
function charsDeleted(diffs: string): number {
  let count = 0;
  for (const line of diffs.split("\n")) {
    if (line.startsWith("-") && !line.startsWith("---")) {
      count += line.length - 1; // exclude the leading '-'
    }
  }
  return count;
}

/**
 * Fraction of total churn that was deletion.
 * Formula: charsDeleted / (charsInserted + charsDeleted).
 * 0 = pure addition, 1 = pure deletion, null if no changes.
 */
function rewriteRatio(inserted: number, deleted: number): number | null {
  const total = inserted + deleted;
  if (total === 0) return null;
  return deleted / total;
}

/**
 * Characters per second throughput.
 * Formula: (charsInserted + charsDeleted) / windowDurationSeconds.
 */
function editVelocity(
  inserted: number,
  deleted: number,
  windowSecs: number,
): number {
  if (windowSecs <= 0) return 0;
  return (inserted + deleted) / windowSecs;
}

/**
 * Duration of the flush window in seconds.
 */
function windowDurationSeconds(start: string, end: string): number {
  return (new Date(end).getTime() - new Date(start).getTime()) / 1000;
}

/**
 * Count of unique line numbers affected by the diff.
 * Parses hunk headers (`@@ -a,b +c,d @@`) and counts lines within each hunk.
 */
function linesTouched(diffs: string): number {
  const lines = diffs.split("\n");
  const touchedSet = new Set<string>();
  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    const hunkMatch = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkMatch) {
      oldLine = parseInt(hunkMatch[1], 10);
      newLine = parseInt(hunkMatch[2], 10);
      continue;
    }
    if (line.startsWith("---") || line.startsWith("+++")) continue;
    if (line.startsWith("-")) {
      touchedSet.add(`old:${oldLine}`);
      oldLine++;
    } else if (line.startsWith("+")) {
      touchedSet.add(`new:${newLine}`);
      newLine++;
    } else if (line.startsWith(" ")) {
      oldLine++;
      newLine++;
    }
  }
  return touchedSet.size;
}

/**
 * Detect lines that appear as both `+` and `-` with matching content
 * (edited then reverted or vice versa).
 * Score = thrashing_lines.length / lines_touched.
 */
function thrash(diffs: string, touched: number): ThrashResult {
  const lines = diffs.split("\n");
  const added = new Set<string>();
  const removed = new Set<string>();

  for (const line of lines) {
    if (line.startsWith("---") || line.startsWith("+++")) continue;
    if (line.startsWith("+")) {
      added.add(line.slice(1));
    } else if (line.startsWith("-")) {
      removed.add(line.slice(1));
    }
  }

  const thrashingLines: string[] = [];
  for (const content of added) {
    if (removed.has(content)) {
      thrashingLines.push(content);
    }
  }

  return {
    score: touched > 0 ? thrashingLines.length / touched : 0,
    thrashing_lines: thrashingLines,
  };
}

const ERROR_PATTERNS = [
  /\bTODO\b/,
  /\bFIXME\b/,
  /\bHACK\b/,
  /\b#error\b/,
  /fprintf\s*\(\s*stderr/,
  /\bassert\s*\(/,
];

/**
 * Heuristic error churn: count lines matching error patterns in old vs new content.
 * Returns counts of introduced, resolved, and persisting error-pattern lines.
 */
function errorChurn(oldContent: string, newContent: string): ErrorChurnResult {
  const oldCount = countErrorLines(oldContent);
  const newCount = countErrorLines(newContent);

  const persisting = Math.min(oldCount, newCount);
  return {
    introduced: Math.max(0, newCount - oldCount),
    resolved: Math.max(0, oldCount - newCount),
    persisting,
  };
}

function countErrorLines(content: string): number {
  let count = 0;
  for (const line of content.split("\n")) {
    if (ERROR_PATTERNS.some((p) => p.test(line))) {
      count++;
    }
  }
  return count;
}

/**
 * Detect significant delete-rewrite patterns.
 * If chars_deleted > 50 AND chars_inserted > 50 AND rewrite_ratio between 0.3–0.7,
 * return block sizes. Otherwise null.
 */
function deleteRewrite(
  inserted: number,
  deleted: number,
  ratio: number | null,
): DeleteRewriteResult | null {
  if (
    ratio !== null &&
    deleted > 50 &&
    inserted > 50 &&
    ratio >= 0.3 &&
    ratio <= 0.7
  ) {
    return {
      deleted_block_size: deleted,
      rewritten_block_size: inserted,
    };
  }
  return null;
}

/**
 * Convert the Map<string, number> of symbol visit counts to a plain object.
 */
function cursorReadsToObject(
  cursorReads: Map<string, number>,
): Record<string, number> {
  const obj: Record<string, number> = {};
  for (const [key, value] of cursorReads) {
    obj[key] = value;
  }
  return obj;
}
