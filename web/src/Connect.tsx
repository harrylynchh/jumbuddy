import { useState, useEffect, useCallback } from "react";
import { supabase } from "./api/supabase";
import type { Session } from "@supabase/supabase-js";

const API = import.meta.env.VITE_API_URL ?? "https://10000.sethlupo.com";

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
  const [loginUtln, setLoginUtln] = useState("slupo01");
  const [password, setPassword] = useState("testpass123");
  const [error, setError] = useState("");

  const [utln, setUtln] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [connecting, setConnecting] = useState(false);
  const [done, setDone] = useState(false);

  // Workspace path passed from VS Code so callback returns to the right window
  const workspace = new URLSearchParams(window.location.search).get("workspace") ?? "";

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
    if (!res.ok) {
      console.error("connect-info failed:", res.status);
      await supabase.auth.signOut();
      setError("Session expired. Please sign in again.");
      return;
    }
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
    try {
      const res = await fetch(`${API}/api/profiles/resolve-utln`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ utln: loginUtln.trim().toLowerCase() }),
      });
      if (!res.ok) { setError("UTLN not found"); return; }
      const { email } = await res.json();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } catch {
      setError("Could not reach server");
    }
  }

  async function handleConnect(assignmentId: string) {
    if (!session) return;
    setConnecting(true);

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

    const assignment = assignments.find((a) => a.id === assignmentId);
    const course = courses.find((c) => c.id === assignment?.course_id);

    const callbackParams: Record<string, string> = {
      key,
      utln,
      assignment_id: assignmentId,
      course_id: course?.id ?? "",
      server_url: API,
    };
    if (workspace) {
      callbackParams.workspace = workspace;
    }
    const params = new URLSearchParams(callbackParams);

    const vscodeUri = `vscode://jumbuddy.jumbuddy/callback?${params.toString()}`;
    window.location.href = vscodeUri;
    setDone(true);
    setConnecting(false);
  }

  const filteredAssignments = assignments.filter(
    (a) => a.course_id === selectedCourse,
  );

  // Login state
  if (!session) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "var(--bg-page)",
          padding: "1rem",
        }}
      >
        <div
          style={{
            width: "min(420px, 100%)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            background: "var(--surface)",
            padding: "2rem",
          }}
        >
          <h1 style={{ marginTop: 0 }}>Connect to JumBuddy</h1>
          <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
            Sign in to link your VS Code extension.
          </p>
          <form onSubmit={handleLogin}>
            <label style={{ display: "block", marginBottom: "0.35rem", fontWeight: 600 }}>
              UTLN
            </label>
            <input
              type="text"
              value={loginUtln}
              onChange={(e) => setLoginUtln(e.target.value)}
              placeholder="e.g. slupo01"
              style={{
                width: "100%",
                padding: "0.7rem",
                borderRadius: 8,
                border: "1px solid var(--border)",
                marginBottom: "0.8rem",
              }}
            />
            <label style={{ display: "block", marginBottom: "0.35rem", fontWeight: 600 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "0.7rem",
                borderRadius: 8,
                border: "1px solid var(--border)",
                marginBottom: "0.8rem",
              }}
            />
            {error && (
              <p style={{ color: "var(--danger)", marginTop: 0 }}>{error}</p>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "none",
                borderRadius: 8,
                fontWeight: 700,
              }}
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Success state
  if (done) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "var(--bg-page)",
          padding: "1rem",
        }}
      >
        <div
          style={{
            width: "min(480px, 100%)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            background: "var(--surface)",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 999,
              background: "var(--success)",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 1rem",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 style={{ marginTop: 0 }}>Connected!</h1>
          <p style={{ color: "var(--text-muted)", marginBottom: 0 }}>
            VS Code should now be tracking your edits. You can close this tab.
          </p>
        </div>
      </div>
    );
  }

  // Assignment picker state
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "var(--bg-page)",
        padding: "1rem",
      }}
    >
      <div
        style={{
          width: "min(500px, 100%)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          background: "var(--surface)",
          padding: "2rem",
        }}
      >
        <h1 style={{ marginTop: 0 }}>Connect to JumBuddy</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
          Signed in as <strong>{session.user.email}</strong> (utln: {utln})
        </p>

        {courses.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>No courses found for your account.</p>
        ) : (
          <>
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", marginBottom: "0.35rem", fontWeight: 600 }}>
                Course
              </label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.6rem",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                }}
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>
                Assignment
              </label>
              {filteredAssignments.length === 0 ? (
                <p style={{ color: "var(--text-muted)" }}>No assignments for this course.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {filteredAssignments.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => handleConnect(a.id)}
                      disabled={connecting}
                      style={{
                        padding: "0.75rem 1rem",
                        textAlign: "left",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        cursor: connecting ? "wait" : "pointer",
                        background: "var(--surface-muted)",
                      }}
                    >
                      <strong>{a.name}</strong>
                      {a.due_date && (
                        <span style={{ marginLeft: "0.5rem", color: "var(--text-muted)" }}>
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

        {error && (
          <p style={{ color: "var(--danger)", marginTop: "1rem" }}>{error}</p>
        )}
      </div>
    </div>
  );
}
