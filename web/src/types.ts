export type CourseWithRole = {
  role: "professor" | "assistant" | "student";
  course: {
    id: string;
    name: string;
    code: string;
  };
};

export type Assignment = {
  id: string;
  course_id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type StudentEntry = {
  student_id: string;
  enrolled_at: string;
  profile_id: string;
  utln: string;
  email: string;
  display_name: string | null;
};

export type Flush = {
  id: string;
  profile_id: string;
  assignment_id: string;
  file_path: string;
  diffs: string;
  snapshot: string | null;
  content_hash: string;
  sequence_number: number;
  client_flush_id: string;
  start_timestamp: string;
  end_timestamp: string;
  window_duration: number;
};
