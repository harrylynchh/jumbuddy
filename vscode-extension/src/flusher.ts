import { FlushPayload } from "./types";
import { getServerUrl, readConfig } from "./config";
import { httpPost } from "./http";

const queue: FlushPayload[] = [];
let debounceThreshold = 1;

export function setDebounceThreshold(n: number): void {
  debounceThreshold = n;
}

/**
 * Add a flush to the queue. Automatically pushes when threshold is met.
 */
export async function enqueueFlush(flush: FlushPayload): Promise<void> {
  queue.push(flush);
  if (queue.length >= debounceThreshold) {
    await pushFlushes();
  }
}

/**
 * Push all queued flushes to the server immediately.
 */
export async function pushFlushes(): Promise<void> {
  if (queue.length === 0) return;

  const config = readConfig();
  if (!config) return;

  const batch = queue.splice(0, queue.length);
  const url = `${getServerUrl()}/api/extensions/flushes`;

  try {
    const response = await httpPost(url, {
      utln: config.utln,
      assignment_id: config.assignment_id,
      flushes: batch,
    });

    if (!response.ok) {
      queue.unshift(...batch);
      console.error(
        `CodeActivity: flush push failed (${response.status}): ${response.data}`,
      );
    }
  } catch (err) {
    queue.unshift(...batch);
    console.error("CodeActivity: flush push error:", err);
  }
}

export function getQueueLength(): number {
  return queue.length;
}
