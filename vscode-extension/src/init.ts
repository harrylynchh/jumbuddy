import * as fs from "fs";
import * as path from "path";
import {
  getMirrorDir,
  getJumbudDir,
  isTrackedFile,
} from "./config";
import { computeDiff } from "./differ";
import { enqueueFlush, pushFlushes } from "./flusher";
import { computeMetrics } from "./metrics";
import { startTracking } from "./tracker";
import { FlushPayload } from "./types";

/**
 * Scan workspace for tracked files, mirror them, generate init flushes, start tracking.
 */
export async function initializeTracking(workspaceRoot: string): Promise<void> {
  const mirrorDir = getMirrorDir()!;
  const trackedFiles = findTrackedFiles(workspaceRoot);
  const now = new Date().toISOString();

  for (const absPath of trackedFiles) {
    const relativePath = path.relative(workspaceRoot, absPath);
    const content = fs.readFileSync(absPath, "utf-8");

    const mirrorPath = path.join(mirrorDir, relativePath);
    fs.mkdirSync(path.dirname(mirrorPath), { recursive: true });
    fs.writeFileSync(mirrorPath, content);

    const diffs = computeDiff(relativePath, "", content);
    const metrics = computeMetrics(diffs, "", content, now, now, new Map());
    const flush: FlushPayload = {
      file_path: relativePath,
      trigger: "init",
      start_timestamp: now,
      end_timestamp: now,
      diffs,
      active_symbol: null,
      metrics,
    };
    await enqueueFlush(flush);
  }

  await pushFlushes();
  startTracking();
}

function findTrackedFiles(dir: string): string[] {
  const results: string[] = [];
  const jumbudDir = getJumbudDir();

  function walk(current: string): void {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (
          entry.name.startsWith(".") ||
          entry.name === "node_modules" ||
          fullPath === jumbudDir
        ) {
          continue;
        }
        walk(fullPath);
      } else if (entry.isFile() && isTrackedFile(fullPath)) {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}
