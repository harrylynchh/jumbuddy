import { FlushPayload } from "./types";
import { getServerUrl, readConfig } from "./config";
import { httpPost } from "./http";

const queue: FlushPayload[] = [];
const DEBOUNCE_THRESHOLD = 2;

/**
 * Add a flush to the queue. Pushes when threshold is met.
 */
export async function enqueueFlush(flush: FlushPayload): Promise<void> {
  queue.push(flush);
  console.log(
    `[CodeActivity] Flush queued: file=${flush.file_path} trigger=${flush.trigger} queue_size=${queue.length}/${DEBOUNCE_THRESHOLD}`,
  );

  if (queue.length >= DEBOUNCE_THRESHOLD) {
    console.log("[CodeActivity] Queue threshold reached, pushing...");
    await pushFlushes();
  }
}

/**
 * Push all queued flushes to the server immediately.
 */
export async function pushFlushes(): Promise<void> {
  if (queue.length === 0) {
    console.log("[CodeActivity] pushFlushes called but queue is empty");
    return;
  }

  const config = readConfig();
  if (!config) {
    console.warn("[CodeActivity] pushFlushes: no config found, skipping");
    return;
  }

  const batch = queue.splice(0, queue.length);
  const url = `${getServerUrl()}/api/extensions/flushes`;

  console.log(
    `[CodeActivity] Pushing ${batch.length} flushes to ${url}`,
  );

  try {
    const response = await httpPost(url, {
      key: config.key,
      flushes: batch,
    });

    if (!response.ok) {
      queue.unshift(...batch);
      console.error(
        `[CodeActivity] Push FAILED (${response.status}): ${response.data}`,
      );
    } else {
      console.log(
        `[CodeActivity] Push OK: ${response.data}`,
      );
    }
  } catch (err) {
    queue.unshift(...batch);
    console.error("[CodeActivity] Push ERROR:", err);
  }
}

export function getQueueLength(): number {
  return queue.length;
}
