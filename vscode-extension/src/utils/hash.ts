import * as crypto from "crypto";

/**
 * Compute SHA-256 hash of file content.
 * Returns hex string (64 chars).
 */
export function sha256(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}
