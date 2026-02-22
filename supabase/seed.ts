import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function seed() {
  console.log("Seeding database...");

  // Create a test class
  const { data: cls, error: clsErr } = await supabase
    .from("classes")
    .upsert({ name: "CS 101 - Intro to CS", code: "CS101" }, { onConflict: "code" })
    .select()
    .single();

  if (clsErr) {
    console.error("Failed to create class:", clsErr);
    process.exit(1);
  }
  console.log("Created class:", cls.id);

  // Create test users via Supabase Auth
  const users = [
    { email: "professor@test.com", password: "testpass123", role: "professor" },
    { email: "ta@test.com", password: "testpass123", role: "ta" },
    { email: "student1@test.com", password: "testpass123", role: "student" },
    { email: "student2@test.com", password: "testpass123", role: "student" },
  ];

  for (const u of users) {
    const { data: authUser, error: authErr } =
      await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { role: u.role },
      });

    if (authErr) {
      console.log(`User ${u.email} may already exist: ${authErr.message}`);
      continue;
    }

    // Create profile
    await supabase.from("profiles").upsert({
      id: authUser.user.id,
      email: u.email,
      display_name: u.email.split("@")[0],
      role: u.role,
      class_id: cls.id,
    });

    console.log(`Created user: ${u.email} (${u.role})`);
  }

  // Add sample activity logs for students
  const { data: students } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "student");

  if (students) {
    const events = ["file_save", "file_open", "keystroke"];
    const logs = students.flatMap((s) =>
      events.map((evt) => ({
        student_id: s.id,
        event_type: evt,
        payload: { fileName: "main.py", languageId: "python" },
      })),
    );

    const { error: logErr } = await supabase
      .from("activity_logs")
      .insert(logs);

    if (logErr) console.error("Failed to insert logs:", logErr);
    else console.log(`Inserted ${logs.length} activity logs`);
  }

  console.log("Seeding complete!");
}

seed();
