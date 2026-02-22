import { FlushPayload } from "./types";
import { getServerUrl, readConfig } from "./config";
import { httpPost } from "./http";
import { setPushing, flashSuccess, flashError } from "./statusbar";

const queue: FlushPayload[] = [];
const DEBOUNCE_THRESHOLD = 2;

/**
 * Add a flush to the queue. Pushes when threshold is met.
 */
export async function enqueueFlush(flush: FlushPayload): Promise<void> {
  queue.push(flush);
  console.log(
    `[JumBud] Flush queued: file=${flush.file_path} trigger=${flush.trigger} queue_size=${queue.length}/${DEBOUNCE_THRESHOLD}`,
  );

  if (queue.length >= DEBOUNCE_THRESHOLD) {
    console.log("[JumBud] Queue threshold reached, pushing...");
    await pushFlushes();
  }
}

/**
 * Push all queued flushes to the server immediately.
 */
export async function pushFlushes(): Promise<void> {
  if (queue.length === 0) {
    console.log("[JumBud] pushFlushes called but queue is empty");
    return;
  }

  const config = readConfig();
  if (!config) {
    console.warn("[JumBud] pushFlushes: no config found, skipping");
    return;
  }

  const batch = queue.splice(0, queue.length);
  const url = `${getServerUrl()}/api/extensions/flushes`;

  console.log(
    `[JumBud] Pushing ${batch.length} flushes to ${url}`,
  );

  setPushing();

  try {
    const response = await httpPost(url, {
      key: config.key,
      flushes: batch,
    });

    if (!response.ok) {
      queue.unshift(...batch);
      console.error(
        `[JumBud] Push FAILED (${response.status}): ${response.data}`,
      );
      flashError();
    } else {
      console.log(
        `[JumBud] Push OK: ${response.data}`,
      );
      flashSuccess();
    }
  } catch (err) {
    queue.unshift(...batch);
    console.error("[JumBud] Push ERROR:", err);
    flashError();
  }
}

export function getQueueLength(): number {
  return queue.length;
}
