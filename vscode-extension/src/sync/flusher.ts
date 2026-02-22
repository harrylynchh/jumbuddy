import { FlushPayload } from "../utils/types";
import { getServerUrl, readConfig, loadQueue, saveQueue } from "../utils/config";
import { httpPost } from "./http";
import { setPushing, flashSuccess, flashError } from "../ui/statusbar";

let queue: FlushPayload[] = [];
const DEBOUNCE_THRESHOLD = 2;

// Load persisted queue on module initialization
queue = loadQueue<FlushPayload>();
if (queue.length > 0) {
  console.log(`[JumBuddy] Flusher: loaded ${queue.length} flushes from persistent queue`);
}

/**
 * Add a flush to the queue. Persists immediately for crash recovery.
 * Pushes when threshold is met.
 */
export async function enqueueFlush(flush: FlushPayload): Promise<void> {
  queue.push(flush);
  saveQueue(queue); // Persist immediately for crash recovery

  console.log(
    `[JumBuddy] Flush queued: file=${flush.file_path} seq=${flush.sequence_number} trigger=${flush.trigger} queue_size=${queue.length}/${DEBOUNCE_THRESHOLD}`,
  );

  if (queue.length >= DEBOUNCE_THRESHOLD) {
    console.log("[JumBuddy] Queue threshold reached, pushing...");
    await pushFlushes();
  }
}

/**
 * Push all queued flushes to the server immediately.
 */
export async function pushFlushes(): Promise<void> {
  if (queue.length === 0) {
    console.log("[JumBuddy] pushFlushes called but queue is empty");
    return;
  }

  const config = readConfig();
  if (!config) {
    console.warn("[JumBuddy] pushFlushes: no config found, skipping");
    return;
  }

  const batch = queue.splice(0, queue.length);
  saveQueue(queue); // Persist after removing batch
  const url = `${getServerUrl()}/api/extensions/flushes`;

  console.log(
    `[JumBuddy] Pushing ${batch.length} flushes to ${url}`,
  );

  setPushing();

  try {
    const response = await httpPost(url, {
      key: config.key,
      flushes: batch,
    });

    if (!response.ok) {
      // Push failed, re-add to front of queue and persist
      queue.unshift(...batch);
      saveQueue(queue);
      console.error(
        `[JumBuddy] Push FAILED (${response.status}): ${response.data}`,
      );
      flashError();
    } else {
      console.log(
        `[JumBuddy] Push OK: ${response.data}`,
      );
      flashSuccess();
    }
  } catch (err) {
    // Push failed, re-add to front of queue and persist
    queue.unshift(...batch);
    saveQueue(queue);
    console.error("[JumBuddy] Push ERROR:", err);
    flashError();
  }
}

export function getQueueLength(): number {
  return queue.length;
}
