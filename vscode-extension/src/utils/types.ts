export interface ThrashResult {
  score: number;
  thrashing_lines: string[];
}

export interface DeleteRewriteResult {
  deleted_block_size: number;
  rewritten_block_size: number;
}

export interface FlushMetrics {
  chars_inserted: number;      // total chars typed during window (not net diff)
  chars_deleted: number;       // total chars removed during window (not net diff)
  rewrite_ratio: number | null;
  edit_velocity: number;
  lines_touched: number;       // from live line-edit map, not diff parsing
  thrash: ThrashResult;        // lines edited 3+ times during window
  delete_rewrite: DeleteRewriteResult | null;
  cursor_reads: Record<string, number>;
  pause_count: number;         // pauses > 2s between edits during window
  edit_events: number;         // total VS Code content change events
}

export interface FlushPayload {
  file_path: string;
  client_flush_id: string; // UUID for deduplication
  sequence_number: number; // Monotonic per (profile, assignment, file_path)
  content_hash: string; // SHA-256 of file after applying diff
  trigger:
    | "init"
    | "timeout"
    | "file_switch"
    | "symbol_change"
    | "max_duration"
    | "deactivate";
  start_timestamp: string; // ISO 8601
  end_timestamp: string;
  diffs: string;
  snapshot: string | null; // Full file content, populated periodically
  active_symbol: string | null;
  metrics: FlushMetrics;
}

export interface JumbuddyConfig {
  utln: string;
  key: string;
  assignment_id: string;
  course_id: string;
  server_url: string;
  debug?: boolean;  // EXTENSION_DEBUG: if true, log detailed flush stats
}

export interface Course {
  id: string;
  name: string;
  code: string;
}

export interface Assignment {
  id: string;
  name: string;
  description: string | null;
  due_date: string | null;
}
