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
