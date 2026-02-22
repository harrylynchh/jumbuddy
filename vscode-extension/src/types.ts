export interface ThrashResult {
  score: number;
  thrashing_lines: string[];
}

export interface ErrorChurnResult {
  introduced: number;
  resolved: number;
  persisting: number;
}

export interface DeleteRewriteResult {
  deleted_block_size: number;
  rewritten_block_size: number;
}

export interface FlushMetrics {
  chars_inserted: number;
  chars_deleted: number;
  rewrite_ratio: number | null;
  edit_velocity: number;
  lines_touched: number;
  thrash: ThrashResult;
  error_churn: ErrorChurnResult;
  delete_rewrite: DeleteRewriteResult | null;
  cursor_reads: Record<string, number>;
}

export interface FlushPayload {
  file_path: string;
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
  active_symbol: string | null;
  metrics: FlushMetrics;
}

export interface JumbudConfig {
  utln: string;
  key: string;
  assignment_id: string;
  course_id: string;
  server_url: string;
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
