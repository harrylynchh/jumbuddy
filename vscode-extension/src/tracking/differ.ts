import { createTwoFilesPatch } from "diff";

/**
 * Compute a unified diff between old (mirror) and new (current) file content.
 *
 * WHITESPACE PRESERVATION:
 * - Normalizes line endings to LF (\n) to prevent CRLF/LF mismatches
 * - Preserves tabs, spaces, and all other whitespace exactly
 * - No trailing whitespace trimming
 */
export function computeDiff(
  filePath: string,
  oldContent: string,
  newContent: string,
): string {
  // Normalize line endings to LF to ensure cross-platform consistency
  // This prevents CRLF (Windows) vs LF (Unix/Mac) reconstruction issues
  const oldNormalized = oldContent.replace(/\r\n/g, "\n");
  const newNormalized = newContent.replace(/\r\n/g, "\n");

  return createTwoFilesPatch(
    filePath,
    filePath,
    oldNormalized,
    newNormalized,
    undefined,
    undefined,
    {
      // CRITICAL: Do NOT ignore whitespace
      // We need exact whitespace for proper reconstruction
      ignoreWhitespace: false,
    }
  );
}
