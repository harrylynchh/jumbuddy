import { useState, useEffect, useCallback } from "react";
import { supabase } from "./api/supabase";
import type { Session } from "@supabase/supabase-js";

const API = "http://localhost:10000";

interface Course {
  id: string;
  name: string;
  code: string;
}

interface Assignment {
  id: string;
  name: string;
  description: string | null;
  due_date: string | null;
  course_id: string;
}

export default function Connect() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("student1@codeactivity.test");
  const [password, setPassword] = useState("testpass123");
  const [error, setError] = useState("");

  const [utln, setUtln] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [connecting, setConnecting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) =>
      setSession(s),
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  const loadConnectInfo = useCallback(async () => {
    if (!session) return;
    const res = await fetch(`${API}/api/extensions/connect-info`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) return;
    const json = await res.json();
    setUtln(json.utln);
    setCourses(json.courses);
    setAssignments(json.assignments);
    if (json.courses.length > 0) {
      setSelectedCourse(json.courses[0].id);
    }
  }, [session]);

  useEffect(() => {
    loadConnectInfo();
  }, [loadConnectInfo]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setError(error.message);
  }

  async function handleConnect(assignmentId: string) {
    if (!session) return;
    setConnecting(true);

    // Generate/get the assignment key
    const res = await fetch(`${API}/api/extensions/generate-key`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ assignment_id: assignmentId }),
    });

    if (!res.ok) {
      setError("Failed to generate assignment key");
      setConnecting(false);
      return;
    }

    const { key } = await res.json();

    // Find assignment and course details
    const assignment = assignments.find((a) => a.id === assignmentId);
    const course = courses.find((c) => c.id === assignment?.course_id);

    // Build the vscode:// callback URI
    const params = new URLSearchParams({
      key,
      utln,
      assignment_id: assignmentId,
      course_id: course?.id ?? "",
      server_url: API,
    });

    const vscodeUri = `vscode://codeactivity.code-activity-logger/callback?${params.toString()}`;
    window.location.href = vscodeUri;
    setDone(true);
    setConnecting(false);
  }

  const filteredAssignments = assignments.filter(
    (a) => a.course_id === selectedCourse,
  );

  if (!session) {
    return (
      <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif", maxWidth: 400, margin: "0 auto" }}>
        <h1>Connect to VS Code</h1>
        <p>Sign in to link your VS Code extension.</p>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: "0.5rem" }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: "100%", padding: "0.5rem" }}
            />
          </div>
          <div style={{ marginBottom: "0.5rem" }}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", padding: "0.5rem" }}
            />
          </div>
          {error && <p style={{ color: "red" }}>{error}</p>}
          <button type="submit" style={{ padding: "0.5rem 1rem" }}>
            Sign In
          </button>
        </form>
      </div>
    );
  }

  if (done) {
    return (
      <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif", maxWidth: 500, margin: "0 auto", textAlign: "center" }}>
        <h1>Connected!</h1>
        <p>VS Code should now be tracking your edits. You can close this tab.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif", maxWidth: 500, margin: "0 auto" }}>
      <h1>Connect to VS Code</h1>
      <p>
        Signed in as <strong>{session.user.email}</strong> (utln: {utln})
      </p>

      {courses.length === 0 ? (
        <p>No courses found for your account.</p>
      ) : (
        <>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "bold" }}>
              Course
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              style={{ width: "100%", padding: "0.5rem" }}
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "bold" }}>
              Assignment
            </label>
            {filteredAssignments.length === 0 ? (
              <p style={{ color: "#888" }}>No assignments for this course.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {filteredAssignments.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => handleConnect(a.id)}
                    disabled={connecting}
                    style={{
                      padding: "0.75rem 1rem",
                      textAlign: "left",
                      border: "1px solid #ccc",
                      borderRadius: 4,
                      cursor: connecting ? "wait" : "pointer",
                      background: "#f9f9f9",
                    }}
                  >
                    <strong>{a.name}</strong>
                    {a.due_date && (
                      <span style={{ marginLeft: "0.5rem", color: "#888" }}>
                        Due: {new Date(a.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {error && <p style={{ color: "red", marginTop: "1rem" }}>{error}</p>}
    </div>
  );
}
