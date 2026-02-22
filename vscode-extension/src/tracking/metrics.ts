import {
  FlushMetrics,
  ThrashResult,
  DeleteRewriteResult,
} from "../utils/types";

/**
 * Live metrics accumulated during the debounce window from VS Code
 * contentChanges events. These capture behavioral data NOT in diffs:
 * total keystrokes (including intermediate edits that cancel out),
 * per-line edit frequency, and pause patterns.
 */
export interface LiveMetrics {
  charsAdded: number;                    // ALL chars typed (including later-deleted)
  charsRemoved: number;                  // ALL chars removed (including later-retyped)
  lineEditCounts: Map<number, number>;   // line number → times edited
  editEvents: number;                    // total VS Code content change events
  lastEditMs: number;                    // timestamp of last edit (for pause detection)
  pauseCount: number;                    // pauses > 2 seconds between edits
}

/** Create a zeroed LiveMetrics (for init flushes or empty windows). */
export function emptyLiveMetrics(): LiveMetrics {
  return {
    charsAdded: 0,
    charsRemoved: 0,
    lineEditCounts: new Map(),
    editEvents: 0,
    lastEditMs: 0,
    pauseCount: 0,
  };
}

/**
 * Derive FlushMetrics from live-tracked keystroke data.
 *
 * chars_inserted/deleted reflect ALL activity during the window,
 * not just the net diff. This means if a student types 100 chars,
 * deletes 80, then types 50 more, we report inserted=150 deleted=80
 * (the diff would only show net +70).
 */
export function computeMetrics(
  live: LiveMetrics,
  _oldContent: string,
  _newContent: string,
  startTimestamp: string,
  endTimestamp: string,
  cursorReads: Map<string, number>,
): FlushMetrics {
  const inserted = live.charsAdded;
  const deleted = live.charsRemoved;
  const ratio = rewriteRatio(inserted, deleted);
  const windowSecs = windowDurationSeconds(startTimestamp, endTimestamp);
  const touched = live.lineEditCounts.size;

  return {
    chars_inserted: inserted,
    chars_deleted: deleted,
    rewrite_ratio: ratio,
    edit_velocity: editVelocity(inserted, deleted, windowSecs),
    lines_touched: touched,
    thrash: thrash(live.lineEditCounts, touched),
    delete_rewrite: deleteRewrite(inserted, deleted, ratio),
    cursor_reads: cursorReadsToObject(cursorReads),
    pause_count: live.pauseCount,
    edit_events: live.editEvents,
  };
}

/**
 * Fraction of total churn that was deletion.
 * 0 = pure addition, 1 = pure deletion, null if no changes.
 */
function rewriteRatio(inserted: number, deleted: number): number | null {
  const total = inserted + deleted;
  if (total === 0) return null;
  return deleted / total;
}

/**
 * Characters per second throughput.
 */
function editVelocity(
  inserted: number,
  deleted: number,
  windowSecs: number,
): number {
  if (windowSecs <= 0) return 0;
  return (inserted + deleted) / windowSecs;
}

function windowDurationSeconds(start: string, end: string): number {
  return (new Date(end).getTime() - new Date(start).getTime()) / 1000;
}

/**
 * Detect thrashing from live line-edit counts.
 * Lines edited 3+ times during a single window are "thrashing" —
 * the student keeps revisiting the same line.
 */
function thrash(lineEditCounts: Map<number, number>, touched: number): ThrashResult {
  const thrashingLines: string[] = [];
  for (const [line, count] of lineEditCounts) {
    if (count >= 3) {
      thrashingLines.push(`L${line}(${count}x)`);
    }
  }
  return {
    score: touched > 0 ? thrashingLines.length / touched : 0,
    thrashing_lines: thrashingLines,
  };
}

/**
 * Detect significant delete-rewrite patterns.
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

function cursorReadsToObject(
  cursorReads: Map<string, number>,
): Record<string, number> {
  const obj: Record<string, number> = {};
  for (const [key, value] of cursorReads) {
    obj[key] = value;
  }
  return obj;
}
