import { applyPatch } from "diff";
import type { Flush } from "../types";

/**
 * Normalize line endings to LF for consistent reconstruction.
 * Prevents CRLF/LF mismatches between platforms.
 */
function normalizeLF(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

/**
 * Reconstruct file content at a given step index.
 * Finds the latest snapshot at or before targetIndex, then applies diffs forward.
 *
 * WHITESPACE PRESERVATION:
 * - Line endings normalized to LF for cross-platform consistency
 * - All other whitespace (tabs, spaces, indentation) preserved exactly
 * - If reconstruction fails, returns partial content (last known good state)
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
  let content = snapshotIdx >= 0 ? normalizeLF(flushes[snapshotIdx].snapshot!) : "";
  const startFrom = snapshotIdx >= 0 ? snapshotIdx + 1 : 0;

  // Apply diffs forward with whitespace preservation
  for (let i = startFrom; i <= idx; i++) {
    const flush = flushes[i];
    if (flush.snapshot != null) {
      // Jump to snapshot
      content = normalizeLF(flush.snapshot);
    } else {
      // Normalize both content and diff to prevent line ending issues
      const normalizedContent = normalizeLF(content);
      const normalizedDiff = normalizeLF(flush.diffs);

      const result = applyPatch(normalizedContent, normalizedDiff);
      if (result === false) {
        // Patch failed — log error in console and return last known good state
        console.error(`[Reconstruct] Patch failed at flush ${i}/${idx}`, {
          file: flush.file_path,
          sequence: flush.sequence_number,
          contentLength: content.length,
          diffPreview: flush.diffs.slice(0, 200),
        });
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
