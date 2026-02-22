import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import {
  getMirrorDir,
  getJumbuddyDir,
  isTrackedFile,
  getNextSequence,
} from "../utils/config";
import { computeDiff } from "./differ";
import { enqueueFlush, pushFlushes } from "../sync/flusher";
import { computeMetrics, emptyLiveMetrics } from "./metrics";
import { startTracking } from "./tracker";
import { FlushPayload } from "../utils/types";
import { sha256 } from "../utils/hash";

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
    const metrics = computeMetrics(emptyLiveMetrics(), "", content, now, now, new Map());
    const sequence = getNextSequence(relativePath);
    const hash = sha256(content);

    const flush: FlushPayload = {
      file_path: relativePath,
      client_flush_id: crypto.randomUUID(),
      sequence_number: sequence,
      content_hash: hash,
      trigger: "init",
      start_timestamp: now,
      end_timestamp: now,
      diffs,
      snapshot: content, // Init always includes full snapshot
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
  const jumbuddyDir = getJumbuddyDir();

  function walk(current: string): void {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (
          entry.name.startsWith(".") ||
          entry.name === "node_modules" ||
          fullPath === jumbuddyDir
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
