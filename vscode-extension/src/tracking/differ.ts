import { createTwoFilesPatch } from "diff";

/**
 * Compute a unified diff between old (mirror) and new (current) file content.
 */
export function computeDiff(
  filePath: string,
  oldContent: string,
  newContent: string,
): string {
  return createTwoFilesPatch(filePath, filePath, oldContent, newContent);
}
