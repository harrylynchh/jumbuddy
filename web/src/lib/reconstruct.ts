import { applyPatch } from "diff";
import type { Flush } from "../types";

/**
 * Reconstruct file content at a given step index.
 * Finds the latest snapshot at or before targetIndex, then applies diffs forward.
 */
export function reconstructFileAtStep(
  flushes: Flush[],
  targetIndex: number,
): string {
  if (flushes.length === 0 || targetIndex < 0) return "";

  const idx = Math.min(targetIndex, flushes.length - 1);

  // Find the latest snapshot at or before targetIndex
  let snapshotIdx = -1;
  for (let i = idx; i >= 0; i--) {
    if (flushes[i].snapshot != null) {
      snapshotIdx = i;
      break;
    }
  }

  // Start from snapshot content or empty string
  let content = snapshotIdx >= 0 ? flushes[snapshotIdx].snapshot! : "";
  const startFrom = snapshotIdx >= 0 ? snapshotIdx + 1 : 0;

  // Apply diffs forward
  for (let i = startFrom; i <= idx; i++) {
    const flush = flushes[i];
    if (flush.snapshot != null) {
      content = flush.snapshot;
    } else {
      const result = applyPatch(content, flush.diffs);
      if (result === false) {
        // Patch failed — return what we have so far
        break;
      }
      content = result;
    }
  }

  return content;
}

/**
 * Dedup flushes by client_flush_id, keeping the first occurrence.
 */
export function dedupFlushes(flushes: Flush[]): Flush[] {
  const seen = new Set<string>();
  return flushes.filter((f) => {
    if (seen.has(f.client_flush_id)) return false;
    seen.add(f.client_flush_id);
    return true;
  });
}
