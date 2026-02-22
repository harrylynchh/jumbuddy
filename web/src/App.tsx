import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./api/supabase";
import { apiFetch } from "./api/client";
import type { Session } from "@supabase/supabase-js";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import type {
  CourseWithRole,
  Assignment,
  StudentEntry,
  Flush,
} from "./types";
import { reconstructFileAtStep, dedupFlushes } from "./lib/reconstruct";
import { tokenizeCode, getTokenColor } from "./lib/highlight";

type ThemeMode = "light" | "dark";

const appShellStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "var(--bg-app)",
  color: "var(--text-primary)",
};

function Navbar({
  courses,
  onSignOut,
  theme,
  onToggleTheme,
  collapsed,
  onToggleCollapsed,
}: {
  courses: CourseWithRole[];
  onSignOut: () => Promise<void>;
  theme: ThemeMode;
  onToggleTheme: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const location = useLocation();

  const bottomItems = [
    { label: "About Our Product", to: "/about", icon: "about" as NavIconName },
    { label: "FAQ", to: "/faq", icon: "faq" as NavIconName },
    { label: "Account", to: "/account", icon: "account" as NavIconName },
  ];

  function renderNavIcon(icon: NavIconName) {
    if (icon === "faq") {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          <path d="M9.8 9.2a2.4 2.4 0 1 1 4.2 1.6c-.8.8-1.7 1.2-1.7 2.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="16.8" r="1" fill="currentColor" />
        </svg>
      );
    }
    if (icon === "about") {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 10.6V16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="7.5" r="1" fill="currentColor" />
        </svg>
      );
    }
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="8.2" r="3.2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5 19.2c1.7-2.8 4-4.2 7-4.2s5.3 1.4 7 4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <aside className="sidebar">
      {/* Header */}
      <div style={{ padding: "0.85rem 0.9rem", borderBottom: "1px solid var(--border)" }}>
        <div style={{ fontWeight: 800, letterSpacing: 0.5, fontSize: 24, lineHeight: 1.1, display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/jumbuddy.png" alt="" width={28} height={28} style={{ imageRendering: "pixelated" }} />
          <span className="brand-label">JumBuddy</span>
          <span className="brand-mini">JB</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav" style={{ display: "grid", gap: "0.15rem", padding: "0.6rem", alignContent: "start" }}>
        {/* Section: Courses */}
        {courses.length > 0 && (
          <>
            <div className="nav-section-label" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", padding: "0.4rem 0.5rem 0.15rem", letterSpacing: 1.2 }}>
              <span className="nav-label">Courses</span>
            </div>
            {courses.map((c) => {
              const code = c.course.code;
              const active = location.pathname.startsWith(`/${code}`);
              return (
                <Link
                  key={c.course.id}
                  to={`/${code}`}
                  className={`nav-link ${active ? "nav-link--active" : ""}`}
                  data-tooltip={c.course.name}
                  aria-label={c.course.name}
                >
                  <span className="nav-icon">{courseIcon}</span>
                  <span className="nav-label">{code}</span>
                </Link>
              );
            })}
          </>
        )}

        {/* Spacer */}
        <div style={{ borderTop: "1px solid var(--border)", margin: "0.6rem 0.35rem" }} />

        {/* Section: Help */}
        <Link to="/faq" className={`nav-link ${location.pathname === "/faq" ? "nav-link--active" : ""}`} data-tooltip="FAQ / How To Use" aria-label="FAQ / How To Use">
          <span className="nav-icon">{faqIcon}</span>
          <span className="nav-label">FAQ</span>
        </Link>
        <Link to="/about" className={`nav-link ${location.pathname === "/about" ? "nav-link--active" : ""}`} data-tooltip="About Our Product" aria-label="About Our Product">
          <span className="nav-icon">{aboutIcon}</span>
          <span className="nav-label">About</span>
        </Link>
        <Link to="/account" className={`nav-link ${location.pathname === "/account" ? "nav-link--active" : ""}`} data-tooltip="Account" aria-label="Account">
          <span className="nav-icon">{accountIcon}</span>
          <span className="nav-label">Account</span>
        </Link>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer" style={{ marginTop: "auto", display: "flex", gap: "0.5rem", padding: "0.8rem", borderTop: "1px solid var(--border)" }}>
        <button
          className="btn btn-secondary theme-toggle"
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          style={{ display: "grid", placeItems: "center" }}
        >
          {theme === "dark" ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 4V2M12 22v-2M4 12H2m20 0h-2M6.34 6.34 4.93 4.93m14.14 14.14-1.41-1.41M6.34 17.66l-1.41 1.41m14.14-14.14-1.41 1.41M12 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <button className="btn btn-secondary signout-btn" onClick={() => void onSignOut()} style={{ flex: 1, padding: "0.45rem 0.75rem" }}>
          <span className="signout-label">Sign Out</span>
          <span className="signout-mini">⎋</span>
        </button>
      </div>
      <button
        className="sidebar-toggle-rail"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? "›" : "‹"}
      </button>
    </aside>
  );
}

function LoginPage({ onLogin }: { onLogin: (email: string, password: string) => Promise<string | null> }) {
  const [utln, setUtln] = useState("msheld01");
  const [password, setPassword] = useState("testpass123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:10000";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Resolve UTLN → email via server
      const res = await fetch(`${BASE_URL}/api/profiles/resolve-utln`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ utln: utln.trim().toLowerCase() }),
      });
      if (!res.ok) {
        setError("UTLN not found");
        setLoading(false);
        return;
      }
      const { email } = await res.json();
      const nextError = await onLogin(email, password);
      if (nextError) {
        setError(nextError);
      } else {
        navigate("/", { replace: true });
      }
    } catch {
      setError("Could not reach server");
    }
    setLoading(false);
  }

  return (
    <div style={{ height: "100vh", display: "grid", gridTemplateColumns: "minmax(320px, 420px) 1fr", background: "var(--bg-page)" }}>
      <section style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "2.5rem", background: "var(--surface)", borderRight: "1px solid var(--border)" }}>
        <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: 0.5, lineHeight: 1, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/jumbuddy.png" alt="" width={40} height={40} style={{ imageRendering: "pixelated" }} />
          JumBuddy
        </div>
        <form onSubmit={submit}>
          <label style={{ display: "block", marginBottom: "0.35rem", fontWeight: 600 }}>UTLN</label>
          <input type="text" value={utln} onChange={(e) => setUtln(e.target.value)} placeholder="e.g. mprof01" style={{ width: "100%", padding: "0.7rem", borderRadius: 8, border: "1px solid var(--border)", marginBottom: "0.8rem" }} />
          <label style={{ display: "block", marginBottom: "0.35rem", fontWeight: 600 }}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", padding: "0.7rem", borderRadius: 8, border: "1px solid var(--border)", marginBottom: "1rem" }} />
          {error && <p style={{ color: "var(--danger)", marginTop: 0 }}>{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", padding: "0.75rem", border: "none", borderRadius: 8, fontWeight: 700 }}>
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>
      </section>
      <div style={{ backgroundImage: "url(https://images.unsplash.com/photo-1534665482403-a909d0d97c67?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bWFuJTIwY29kaW5nfGVufDB8fDB8fHww)", backgroundSize: "cover", backgroundPosition: "center" }} />
    </div>
  );
}

function CoursePage({ courses }: { courses: CourseWithRole[] }) {
  const { courseCode } = useParams();
  const courseEntry = courses.find((c) => c.course.code === courseCode);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseEntry) return;
    setLoading(true);
    apiFetch<Assignment[]>(`/assignments/course/${courseEntry.course.id}`)
      .then(setAssignments)
      .catch(() => setAssignments([]))
      .finally(() => setLoading(false));
  }, [courseEntry?.course.id]);

  if (!courseEntry) return <NotFoundPage />;

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "1rem 1.1rem 2rem" }}>
      <h1 style={{ marginBottom: "0.3rem" }}>{courseEntry.course.name}</h1>
      <p style={{ marginTop: 0, color: "var(--text-muted)" }}>{courseEntry.role} • {courseEntry.course.code}</p>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading assignments...</p>
      ) : assignments.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>No assignments yet.</p>
      ) : (
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.9rem" }}>
          {assignments.map((a) => (
            <article className="surface-card" key={a.id} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "1rem", background: "var(--surface)" }}>
              <h2 style={{ marginTop: 0, marginBottom: "0.35rem", fontSize: 19 }}>{a.name}</h2>
              {a.description && <p style={{ margin: "0 0 0.8rem", color: "var(--text-muted)" }}>{a.description}</p>}
              <Link to={`/${courseCode}/${a.id}`} className="text-link" style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>
                Open Assignment
              </Link>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

type StudentAnalysis = {
  linger: { file_path: string; symbol: string; linger_score: number; dwell_time: number; churn: number; visits: number }[];
  focus: { file_path: string; symbol: string; weighted_time: number }[];
  total_time_sec: number;
  file_breakdown: { file_path: string; time_sec: number }[];
};

type ClassAnalysis = {
  struggle_topics: { symbol: string; struggle_index: number; student_count: number; avg_dwell_time: number; avg_churn: number }[];
  student_count: number;
  total_flushes: number;
  student_lingers: Record<string, { file_path: string; symbol: string; linger_score: number; dwell_time: number; churn: number; visits: number }[]>;
};

type AIReport = {
  report: string;
};

/** Hoverable info tooltip */
function InfoTip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      style={{ position: "relative", display: "inline-flex", alignItems: "center", cursor: "help", marginLeft: 4 }}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.45 }}>
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
        <text x="8" y="12" textAnchor="middle" fill="currentColor" fontSize="10" fontWeight="700">i</text>
      </svg>
      {show && (
        <span style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
          background: "var(--text-primary)", color: "var(--bg-app)", padding: "6px 10px",
          borderRadius: 6, fontSize: 11, lineHeight: 1.4, fontWeight: 500,
          whiteSpace: "normal", width: 220, textAlign: "left",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)", zIndex: 20, pointerEvents: "none",
        }}>
          {text}
        </span>
      )}
    </span>
  );
}

/** Continuous color scale: teal (0) → amber (0.5) → hot pink (1.0) */
function struggleColor(t: number): string {
  t = Math.max(0, Math.min(t, 1));
  let r: number, g: number, b: number;
  if (t < 0.5) {
    const s = t / 0.5;
    r = Math.round(15 + s * 230);
    g = Math.round(180 - s * 5);
    b = Math.round(170 - s * 125);
  } else {
    const s = (t - 0.5) / 0.5;
    r = Math.round(245 - s * 10);
    g = Math.round(175 - s * 130);
    b = Math.round(45 + s * 30);
  }
  return `rgb(${r}, ${g}, ${b})`;
}

type ClassSortMetric = "struggle_index" | "avg_dwell_time" | "avg_churn" | "student_count";
const classSortOptions: { key: ClassSortMetric; label: string }[] = [
  { key: "struggle_index", label: "Score" },
  { key: "avg_dwell_time", label: "Time" },
  { key: "avg_churn", label: "Churn" },
  { key: "student_count", label: "Students" },
];

function StruggleBarChart({
  topics,
  onBarClick,
}: {
  topics: { symbol: string; struggle_index: number; student_count: number; avg_dwell_time: number; avg_churn: number }[];
  onBarClick?: (symbol: string) => void;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [sortMetric, setSortMetric] = useState<ClassSortMetric>("struggle_index");

  const sorted = [...topics].sort((a, b) => b[sortMetric] - a[sortMetric]);
  const maxVal = Math.max(1, ...sorted.map((t) => t[sortMetric]));
  // For color, always use struggle_index ratio
  const maxScore = Math.max(1, ...sorted.map((t) => t.struggle_index));

  if (sorted.length === 0) {
    return <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0.5rem 0" }}>No struggle data yet.</p>;
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 2, marginBottom: 6 }}>
        {classSortOptions.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSortMetric(key)}
            style={{
              padding: "2px 7px", fontSize: 10, borderRadius: 4, fontWeight: 600,
              background: sortMetric === key ? "var(--accent)" : "var(--surface-muted)",
              color: sortMetric === key ? "#fff" : "var(--text-muted)",
              border: sortMetric === key ? "1px solid var(--accent)" : "1px solid var(--border-soft)",
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {sorted.map((topic, i) => {
        const pct = (topic[sortMetric] / maxVal) * 100;
        const colorT = topic.struggle_index / maxScore;
        const bg = struggleColor(colorT);
        const isHovered = hoveredIdx === i;

        return (
          <div
            key={topic.symbol}
            style={{ display: "flex", alignItems: "center", gap: 8, cursor: onBarClick ? "pointer" : "default" }}
            onClick={() => onBarClick?.(topic.symbol)}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            {/* Symbol label */}
            <span
              style={{
                width: 110,
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-primary)",
                textAlign: "right",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                flexShrink: 0,
              }}
              title={topic.symbol}
            >
              {topic.symbol}
            </span>

            {/* Bar track */}
            <div
              style={{
                flex: 1,
                height: 24,
                borderRadius: 6,
                background: "var(--border)",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* Filled bar */}
              <div
                style={{
                  width: `${Math.max(pct, 2)}%`,
                  height: "100%",
                  borderRadius: 6,
                  background: `linear-gradient(90deg, ${struggleColor(colorT * 0.6)}, ${bg})`,
                  transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1), filter 0.15s ease",
                  filter: isHovered ? "brightness(1.18)" : "none",
                  boxShadow: isHovered ? `0 2px 12px ${bg.replace("rgb", "rgba").replace(")", ",0.4)")}` : "none",
                }}
              />
              {/* Score label inside bar */}
              <span
                style={{
                  position: "absolute",
                  top: 0,
                  left: 8,
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  color: pct > 20 ? "rgba(255,255,255,0.95)" : "var(--text-primary)",
                }}
              >
                {sortMetric === "avg_dwell_time" ? formatTime(topic.avg_dwell_time)
                  : sortMetric === "avg_churn" ? topic.avg_churn.toFixed(1)
                  : sortMetric === "student_count" ? topic.student_count
                  : topic.struggle_index.toFixed(1)}
              </span>
            </div>

            {/* Meta: student count + avg time */}
            <span
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                whiteSpace: "nowrap",
                width: 80,
                flexShrink: 0,
              }}
              title={`${topic.student_count} students struggled here, avg ${Math.round(topic.avg_dwell_time)}s editing time, churn rate ${topic.avg_churn.toFixed(1)}`}
            >
              {topic.student_count} stu · {Math.round(topic.avg_dwell_time)}s avg
            </span>
          </div>
        );
      })}
      </div>
    </div>
  );
}

function formatTime(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function AssignmentPage({ courses }: { courses: CourseWithRole[] }) {
  const { courseCode, assignmentId } = useParams();
  const courseEntry = courses.find((c) => c.course.code === courseCode);
  const [assignmentName, setAssignmentName] = useState("");
  const [students, setStudents] = useState<StudentEntry[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [narrative, setNarrative] = useState("Click a heatmap cell to see a per-student narrative for a specific function or symbol.");
  const [studentSearch, setStudentSearch] = useState("");
  const [studentAnalysis, setStudentAnalysis] = useState<StudentAnalysis | null>(null);
  const [classAnalysis, setClassAnalysis] = useState<ClassAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    if (!assignmentId || !courseEntry) return;
    setLoading(true);
    Promise.all([
      apiFetch<Assignment[]>(`/assignments/course/${courseEntry.course.id}`)
        .then((assignments) => {
          const match = assignments.find((a) => a.id === assignmentId);
          setAssignmentName(match?.name ?? "Assignment");
        })
        .catch(() => setAssignmentName("Assignment")),
      apiFetch<StudentEntry[]>(`/students/assignment/${assignmentId}`)
        .then((data) => {
          setStudents(data);
          if (data.length > 0) setSelectedStudentId(data[0].profile_id);
        })
        .catch(() => setStudents([])),
    ]).finally(() => setLoading(false));
  }, [assignmentId, courseEntry?.course.id]);

  // Fetch class analysis
  useEffect(() => {
    if (!assignmentId) return;
    apiFetch<ClassAnalysis>(`/analysis/class/${assignmentId}`)
      .then(setClassAnalysis)
      .catch(() => setClassAnalysis(null));
  }, [assignmentId]);

  // Fetch student analysis when selection changes
  useEffect(() => {
    if (!selectedStudentId || !assignmentId) return;
    setAnalysisLoading(true);
    setAiReport(null); // Clear previous report
    apiFetch<StudentAnalysis>(`/analysis/student/${selectedStudentId}?assignment_id=${assignmentId}`)
      .then(setStudentAnalysis)
      .catch(() => setStudentAnalysis(null))
      .finally(() => setAnalysisLoading(false));
  }, [selectedStudentId, assignmentId]);

  async function generateAIReport() {
    if (!selectedStudentId || !assignmentId) return;
    setReportLoading(true);
    try {
      const data = await apiFetch<AIReport>(`/analysis/report/${selectedStudentId}?assignment_id=${assignmentId}`);
      setAiReport(data.report);
    } catch {
      setAiReport("Failed to generate report. Please try again.");
    } finally {
      setReportLoading(false);
    }
  }

  if (!courseEntry) return <NotFoundPage />;

  const selectedStudent = students.find((s) => s.profile_id === selectedStudentId);

  const topLinger = studentAnalysis?.linger?.[0];
  const topFocus = studentAnalysis?.focus?.[0];
  const avgChurn = studentAnalysis?.linger?.length
    ? (studentAnalysis.linger.reduce((s, l) => s + l.churn, 0) / studentAnalysis.linger.length).toFixed(1)
    : "—";

  const studentStats = [
    { label: "Time on Assignment", value: studentAnalysis ? formatTime(studentAnalysis.total_time_sec) : "—", tip: "Total active editing time for this assignment." },
    { label: "Top Struggle Area", value: topLinger ? `${topLinger.symbol} (${topLinger.linger_score})` : "—", tip: "The symbol where this student spent the most time rewriting code. The number is the linger score: dwell time × churn × visits." },
    { label: "Current Focus", value: topFocus ? topFocus.symbol : "—", tip: "The symbol this student edited most recently, weighted by recency." },
    { label: "Avg Churn Rate", value: avgChurn, tip: "Average churn across all symbols. Churn = total chars typed / net change. High churn (>3) means lots of rewriting and backtracking." },
  ];

  const struggleTopics = classAnalysis?.struggle_topics ?? [];

  // Compute per-student struggle score (sum of linger scores)
  const studentStruggleScores: Record<string, number> = {};
  if (classAnalysis?.student_lingers) {
    for (const [pid, lingers] of Object.entries(classAnalysis.student_lingers)) {
      studentStruggleScores[pid] = lingers.reduce((s, l) => s + l.linger_score, 0);
    }
  }

  // Toggle for student struggles table sort metric
  const [struggleSortMetric, setStruggleSortMetric] = useState<"linger_score" | "dwell_time" | "churn" | "visits">("linger_score");

  const sortedLinger = studentAnalysis
    ? [...studentAnalysis.linger].sort((a, b) => b[struggleSortMetric] - a[struggleSortMetric]).slice(0, 5)
    : [];

  const classStats = [
    { label: "Students Tracked", value: classAnalysis ? String(classAnalysis.student_count) : "—" },
    { label: "Total Edits", value: classAnalysis ? String(classAnalysis.total_flushes) : "—" },
    { label: "Top Struggle Symbol", value: classAnalysis?.struggle_topics?.[0]?.symbol ?? "—", tip: "The symbol where the most students spent excessive time rewriting code." },
  ];

  return (
    <main style={{ maxWidth: 1240, margin: "0 auto", padding: "1rem 1.1rem 2rem" }}>
      <h1 style={{ marginBottom: "0.3rem" }}>{assignmentName || "Assignment"}</h1>
      <p style={{ marginTop: 0, marginBottom: "1.5rem", color: "var(--text-muted)" }}>{courseEntry.course.name} • {courseEntry.course.code}</p>

      {/* Class statistics section - full width at top, compact */}
      <section style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", padding: "0.75rem 1rem", marginBottom: "1rem" }}>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", gap: "2rem" }}>
          {classStats.map((item: { label: string; value: string; tip?: string }) => (
            <li key={item.label} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)", display: "inline-flex", alignItems: "center" }}>
                {item.label}:{item.tip && <InfoTip text={item.tip} />}
              </span>
              <strong style={{ fontSize: 14 }}>{item.value}</strong>
            </li>
          ))}
        </ul>

        <h3 style={{ marginTop: "0.6rem", marginBottom: "0.5rem", fontSize: 14, display: "flex", alignItems: "center" }}>
          Symbol Struggle Ranking
          <InfoTip text="Ranks code symbols (functions, classes) by how much students struggled with them. Higher scores mean more students spent excessive time rewriting code in that area." />
        </h3>

        <StruggleBarChart
          topics={struggleTopics}
          onBarClick={(symbol) => {
            const topic = struggleTopics.find((t) => t.symbol === symbol);
            if (topic) {
              setNarrative(`${symbol}: struggle ${topic.struggle_index.toFixed(1)} across ${topic.student_count} students, avg ${Math.round(topic.avg_dwell_time)}s dwell, churn ${topic.avg_churn.toFixed(2)}`);
            }
          }}
        />

        {narrative && (
          <p style={{ margin: "0.4rem 0 0", lineHeight: 1.4, fontSize: 12, color: "var(--text-muted)" }}>{narrative}</p>
        )}
      </section>

      {/* Student section - sidebar + stats, compact */}
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "0.8rem" }}>
        {/* Student sidebar */}
        <aside style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", padding: "0.6rem", height: "fit-content" }}>
          <h2 style={{ marginTop: 0, marginBottom: "0.4rem", fontSize: 14 }}>Students</h2>
          {!loading && students.length > 0 && (
            <input
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Search..."
              style={{ width: "100%", padding: "0.3rem 0.4rem", marginBottom: "0.4rem", borderRadius: 6, border: "1px solid var(--border)", fontSize: 12 }}
            />
          )}
          {loading ? (
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 12 }}>Loading...</p>
          ) : students.length === 0 ? (
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 12 }}>No students.</p>
          ) : (() => {
            const filtered = students.filter((s) =>
              s.utln.toLowerCase().includes(studentSearch.toLowerCase())
            );
            const MAX_VISIBLE = 12;
            const visible = filtered.slice(0, MAX_VISIBLE);
            const remaining = filtered.length - MAX_VISIBLE;
            return (
              <>
                {visible.map((s) => (
                  <div
                    key={s.profile_id}
                    onClick={() => setSelectedStudentId(s.profile_id)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "0.25rem 0.35rem", marginBottom: 1, borderRadius: 4, cursor: "pointer",
                      background: selectedStudentId === s.profile_id ? "var(--accent-soft)" : "transparent",
                      fontSize: 12
                    }}
                  >
                    <span style={{ fontWeight: 500, flex: 1 }}>{s.utln}</span>
                    {studentStruggleScores[s.profile_id] != null && (
                      <span style={{ fontSize: 10, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums", marginRight: 4 }}>
                        {studentStruggleScores[s.profile_id].toFixed(1)}
                      </span>
                    )}
                    <Link
                      to={`/${courseCode}/${assignmentId}/${s.profile_id}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}
                    >
                      →
                    </Link>
                  </div>
                ))}
                {remaining > 0 && (
                  <p style={{ margin: "0.25rem 0 0", fontSize: 11, color: "var(--text-muted)" }}>
                    +{remaining} more
                  </p>
                )}
                {filtered.length === 0 && (
                  <p style={{ margin: "0.25rem 0 0", fontSize: 11, color: "var(--text-muted)" }}>No match</p>
                )}
              </>
            );
          })()}
        </aside>

        {/* Right content area - Student stats only, compact */}
        <section style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", padding: "0.75rem" }}>
          <h2 style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: 14, fontWeight: 600 }}>
            {selectedStudent?.display_name ?? selectedStudent?.utln ?? "—"}
          </h2>

          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse", marginBottom: "0.6rem" }}>
            <tbody>
              {studentStats.map((item) => (
                <tr key={item.label} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                  <td style={{ padding: "0.35rem 0.5rem 0.35rem 0", color: "var(--text-muted)", width: "70%" }}>
                    <span style={{ display: "inline-flex", alignItems: "center" }}>
                      {item.label}
                      {item.tip && <InfoTip text={item.tip} />}
                    </span>
                  </td>
                  <td style={{ textAlign: "right", padding: "0.35rem 0", fontWeight: 700, whiteSpace: "nowrap" }}>{item.value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Linger breakdown table */}
          {studentAnalysis && studentAnalysis.linger.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0.5rem 0 0.4rem" }}>
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center" }}>
                  Top 5 Struggles
                  <InfoTip text="Symbols ranked by selected metric. Linger score = dwell × churn × visits. Toggle to sort by submetrics." />
                </h3>
                <div style={{ display: "flex", gap: 2 }}>
                  {([
                    ["linger_score", "Score"],
                    ["dwell_time", "Time"],
                    ["churn", "Churn"],
                    ["visits", "Visits"],
                  ] as const).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setStruggleSortMetric(key)}
                      style={{
                        padding: "2px 7px", fontSize: 10, borderRadius: 4, fontWeight: 600,
                        background: struggleSortMetric === key ? "var(--accent)" : "var(--surface-muted)",
                        color: struggleSortMetric === key ? "#fff" : "var(--text-muted)",
                        border: struggleSortMetric === key ? "1px solid var(--accent)" : "1px solid var(--border-soft)",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse", tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "36%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "16%" }} />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-soft)" }}>
                    <th style={{ textAlign: "left", padding: "0.3rem 0", fontWeight: 600, color: "var(--text-muted)", fontSize: 11 }}>Symbol</th>
                    <th style={{ textAlign: "right", padding: "0.3rem 0", fontWeight: 600, color: struggleSortMetric === "linger_score" ? "var(--accent-strong)" : "var(--text-muted)", fontSize: 11 }}>Score</th>
                    <th style={{ textAlign: "right", padding: "0.3rem 0", fontWeight: 600, color: struggleSortMetric === "dwell_time" ? "var(--accent-strong)" : "var(--text-muted)", fontSize: 11 }}>Time</th>
                    <th style={{ textAlign: "right", padding: "0.3rem 0", fontWeight: 600, color: struggleSortMetric === "churn" ? "var(--accent-strong)" : "var(--text-muted)", fontSize: 11 }}>Churn</th>
                    <th style={{ textAlign: "right", padding: "0.3rem 0", fontWeight: 600, color: struggleSortMetric === "visits" ? "var(--accent-strong)" : "var(--text-muted)", fontSize: 11 }}>Visits</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLinger.map((l, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                      <td style={{ padding: "0.3rem 0", fontFamily: "monospace", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.symbol}</td>
                      <td style={{ textAlign: "right", padding: "0.3rem 0", fontSize: 12, fontWeight: struggleSortMetric === "linger_score" ? 700 : 400 }}>{l.linger_score.toFixed(1)}</td>
                      <td style={{ textAlign: "right", padding: "0.3rem 0", fontSize: 12, fontWeight: struggleSortMetric === "dwell_time" ? 700 : 400 }}>{formatTime(l.dwell_time)}</td>
                      <td style={{ textAlign: "right", padding: "0.3rem 0", fontSize: 12, fontWeight: struggleSortMetric === "churn" ? 700 : 400 }}>{l.churn.toFixed(1)}</td>
                      <td style={{ textAlign: "right", padding: "0.3rem 0", fontSize: 12, fontWeight: struggleSortMetric === "visits" ? 700 : 400 }}>{l.visits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/** Detect session boundaries (>30min gap) and return day labels with flush index positions */
function detectSessions(flushes: Flush[]): { idx: number; label: string }[] {
  if (flushes.length === 0) return [];
  const sessions: { idx: number; label: string }[] = [
    { idx: 0, label: new Date(flushes[0].start_timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" }) },
  ];
  for (let i = 1; i < flushes.length; i++) {
    const gap = new Date(flushes[i].start_timestamp).getTime() - new Date(flushes[i - 1].end_timestamp).getTime();
    if (gap > 30 * 60 * 1000) {
      sessions.push({
        idx: i,
        label: new Date(flushes[i].start_timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      });
    }
  }
  return sessions;
}

// Visual typing state: code + cursor position + edit region for highlighting
type TypingState = {
  code: string;
  cursorPos: number;       // -1 = no cursor visible
  editStart: number;       // start of highlighted edit region
  editEnd: number;         // end of highlighted edit region
  phase: "idle" | "deleting" | "inserting";
};

function CodeViewer({ state, filePath, timestamp }: { state: TypingState; filePath: string; timestamp: string }) {
  const codeRef = useRef<HTMLDivElement>(null);

  const { code, cursorPos, editStart, editEnd, phase } = state;

  const elements: React.ReactNode[] = [];

  if (!code && cursorPos < 0) {
    elements.push(<span key="empty" style={{ color: "#5a6785" }}>{"// No replay data for this file."}</span>);
  } else {
    // Tokenize entire code for syntax highlighting
    const tokens = tokenizeCode(code, filePath);

    // Build token spans with absolute positions: [{start, end, type}]
    const tokenSpans: { start: number; end: number; type: string }[] = [];
    let tokenCharOffset = 0;
    for (const token of tokens) {
      tokenSpans.push({ start: tokenCharOffset, end: tokenCharOffset + token.content.length, type: token.type });
      tokenCharOffset += token.content.length;
    }

    const lines = code.split("\n");
    let charOffset = 0;

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      const lineStart = charOffset;
      const lineEnd = charOffset + line.length;
      const lineNum = lineIdx + 1;

      const cursorOnLine = cursorPos >= lineStart && cursorPos <= lineEnd;
      const editOverlap = editStart < editEnd && editStart < lineEnd + 1 && editEnd > lineStart;

      const lineStyle: React.CSSProperties = {
        display: "block",
        minHeight: "1.5em",
        padding: "0 0 0 0",
        background: cursorOnLine && phase !== "idle" ? (phase === "deleting" ? "rgba(220, 38, 38, 0.08)" : "rgba(34, 197, 94, 0.08)") : "transparent",
        borderLeft: cursorOnLine && phase !== "idle" ? `2px solid ${phase === "deleting" ? "#dc2626" : "#22c55e"}` : "2px solid transparent",
        paddingLeft: "0.5rem",
      };

      const lineContent: React.ReactNode[] = [];

      lineContent.push(
        <span key={`ln-${lineIdx}`} style={{ display: "inline-block", width: 36, color: "#3d4663", textAlign: "right", marginRight: 12, userSelect: "none", fontSize: 11 }}>
          {lineNum}
        </span>
      );

      // Build split points on this line: token boundaries, cursor, edit boundaries
      const splitPoints = new Set<number>();
      splitPoints.add(lineStart);
      splitPoints.add(lineEnd);
      if (cursorOnLine && phase !== "idle") splitPoints.add(cursorPos);
      if (editOverlap) {
        if (editStart > lineStart && editStart < lineEnd) splitPoints.add(editStart);
        if (editEnd > lineStart && editEnd < lineEnd) splitPoints.add(editEnd);
      }
      // Add token boundaries that fall within this line
      for (const ts of tokenSpans) {
        if (ts.start > lineEnd) break;
        if (ts.end < lineStart) continue;
        if (ts.start > lineStart && ts.start < lineEnd) splitPoints.add(ts.start);
        if (ts.end > lineStart && ts.end < lineEnd) splitPoints.add(ts.end);
      }
      const sorted = Array.from(splitPoints).sort((a, b) => a - b);

      // Find which token covers a given position
      let tokenIdx = 0;
      const getTokenType = (pos: number): string => {
        while (tokenIdx < tokenSpans.length && tokenSpans[tokenIdx].end <= pos) tokenIdx++;
        if (tokenIdx < tokenSpans.length && tokenSpans[tokenIdx].start <= pos) return tokenSpans[tokenIdx].type;
        return "plain";
      };

      for (let si = 0; si < sorted.length; si++) {
        const segStart = sorted[si];
        // Insert cursor before this segment if cursor is at segStart
        if (segStart === cursorPos && phase !== "idle") {
          lineContent.push(
            <span
              key={`cursor-${lineIdx}`}
              className="typing-cursor"
              style={{
                display: "inline-block",
                width: 2,
                height: "1.15em",
                background: phase === "deleting" ? "#dc2626" : "#22c55e",
                verticalAlign: "text-bottom",
                marginLeft: -1,
                marginRight: -1,
                animation: "cursor-blink 0.6s step-end infinite",
              }}
            />
          );
        }

        if (si + 1 >= sorted.length) break;
        const segEnd = sorted[si + 1];
        if (segEnd <= segStart) continue;

        const chunk = code.slice(segStart, segEnd);
        if (!chunk) continue;

        const tokenType = getTokenType(segStart);
        const color = getTokenColor(tokenType);
        const inEdit = editOverlap && segStart >= editStart && segEnd <= editEnd;

        if (inEdit) {
          lineContent.push(
            <span key={`s-${lineIdx}-${segStart}`} style={{
              background: phase === "inserting" ? "rgba(34, 197, 94, 0.2)" : "rgba(220, 38, 38, 0.15)",
              borderRadius: 2, color,
            }}>{chunk}</span>
          );
        } else {
          lineContent.push(
            <span key={`s-${lineIdx}-${segStart}`} style={{ color }}>{chunk}</span>
          );
        }
      }

      // Handle cursor at end of line
      if (cursorPos === lineEnd && phase !== "idle" && !cursorOnLine) {
        // already handled above
      }

      elements.push(
        <div key={`line-${lineIdx}`} style={lineStyle}>
          {lineContent}
        </div>
      );

      charOffset = lineEnd + 1;
    }
  }

  useEffect(() => {
    if (cursorPos < 0 || !codeRef.current) return;
    const lineIdx = code.slice(0, cursorPos).split("\n").length - 1;
    const lineEl = codeRef.current.children[lineIdx] as HTMLElement | undefined;
    if (lineEl) {
      lineEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [cursorPos, code]);

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)", padding: "0.75rem", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <style>{`@keyframes cursor-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }`}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem", flexShrink: 0 }}>
        <code style={{ color: "var(--text-muted)", fontSize: 12 }}>{filePath || "—"}</code>
        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{timestamp}</span>
      </div>
      <div
        ref={codeRef}
        style={{
          margin: 0, color: "var(--text-primary)", flex: 1, overflowY: "auto", minHeight: 0,
          fontSize: 13, lineHeight: 1.5,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          whiteSpace: "pre",  // CRITICAL: Preserve all whitespace (spaces, tabs, indentation)
        }}
      >
        {elements}
      </div>
    </div>
  );
}

type ChatMessage = { role: "user" | "assistant"; content: string };

function ChatPanel({
  studentId,
  assignmentId,
  onClose,
}: {
  studentId: string;
  assignmentId: string;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:10000";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch(`${BASE_URL}/api/analysis/chat/${studentId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, assignment_id: assignmentId, history }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No reader");

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") break;
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: "assistant", content: copy[copy.length - 1].content + payload };
            return copy;
          });
        }
      }
    } catch {
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: "assistant", content: "Failed to get response. Please try again." };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div style={{
      position: "absolute", top: 0, right: 0, bottom: 0, width: 360,
      background: "var(--surface)", borderLeft: "1px solid var(--border)",
      display: "flex", flexDirection: "column", zIndex: 10,
      boxShadow: "-4px 0 20px rgba(0,0,0,0.15)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.6rem 0.8rem", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>AI Chat</span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 18, lineHeight: 1 }}>×</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0.6rem", display: "flex", flexDirection: "column", gap: "0.5rem", minHeight: 0 }}>
        {messages.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center", marginTop: "2rem" }}>
            Ask questions about this student's coding journey.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === "user" ? "flex-end" : "flex-start",
            maxWidth: "85%",
            padding: "0.5rem 0.7rem",
            borderRadius: 10,
            fontSize: 13,
            lineHeight: 1.5,
            background: m.role === "user" ? "var(--accent)" : "var(--surface-muted)",
            color: m.role === "user" ? "#fff" : "var(--text-primary)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}>
            {m.content || (streaming && i === messages.length - 1 ? "..." : "")}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={(e) => { e.preventDefault(); send(); }} style={{ display: "flex", gap: "0.4rem", padding: "0.5rem 0.6rem", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this student's work..."
          disabled={streaming}
          style={{
            flex: 1, padding: "0.45rem 0.6rem", borderRadius: 8,
            border: "1px solid var(--border)", fontSize: 13,
            background: "var(--bg-app)", color: "var(--text-primary)",
          }}
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="btn btn-primary"
          style={{ padding: "0.45rem 0.7rem", fontSize: 13, borderRadius: 8 }}
        >
          Send
        </button>
      </form>
    </div>
  );
}

const SPEED_OPTIONS = [1, 2, 4, 8, 16, 100, 500] as const;

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}


/**
 * Pre-compute all file snapshots and a flat timeline of char-level edits.
 * Each "edit segment" is a transition between two flush states, broken into
 * individual character operations spread across the real wall-clock time
 * of that flush. The result is one continuous stream — no visible chunk boundaries.
 */
type EditOp = {
  /** Cumulative time offset in ms from the start of the first flush */
  timeMs: number;
  /** The full code string at this point */
  code: string;
  cursorPos: number;
  editStart: number;
  editEnd: number;
  phase: "idle" | "deleting" | "inserting";
  /** Which flush index this op came from (for timeline/density bar mapping) */
  flushIdx: number;
};

function buildEditStream(flushes: Flush[], reconstruct: (fs: Flush[], idx: number) => string): EditOp[] {
  if (flushes.length === 0) return [];

  const ops: EditOp[] = [];
  const timeOrigin = new Date(flushes[0].start_timestamp).getTime();

  // Initial state
  const initial = reconstruct(flushes, 0);
  ops.push({ timeMs: 0, code: initial, cursorPos: -1, editStart: 0, editEnd: 0, phase: "idle", flushIdx: 0 });

  for (let fi = 1; fi < flushes.length; fi++) {
    const fromCode = reconstruct(flushes, fi - 1);
    const toCode = reconstruct(flushes, fi);
    if (fromCode === toCode) continue;

    const flush = flushes[fi];
    const flushStartMs = new Date(flush.start_timestamp).getTime() - timeOrigin;
    const flushDurMs = Math.max((flush.window_duration || 0.5) * 1000, 100);

    // Find diff region
    let prefixLen = 0;
    while (prefixLen < fromCode.length && prefixLen < toCode.length && fromCode[prefixLen] === toCode[prefixLen]) prefixLen++;
    let fromEnd = fromCode.length;
    let toEnd = toCode.length;
    while (fromEnd > prefixLen && toEnd > prefixLen && fromCode[fromEnd - 1] === toCode[toEnd - 1]) {
      fromEnd--;
      toEnd--;
    }

    const charsToDelete = fromEnd - prefixLen;
    const charsToInsert = toEnd - prefixLen;
    const suffix = fromCode.slice(fromEnd);
    const totalSteps = charsToDelete + charsToInsert;
    if (totalSteps === 0) continue;

    const stepDurMs = flushDurMs / totalSteps;

    for (let s = 0; s < totalSteps; s++) {
      const t = flushStartMs + s * stepDurMs;
      if (s < charsToDelete) {
        const remaining = charsToDelete - s;
        const code = fromCode.slice(0, prefixLen + remaining - 1) + suffix;
        const cursorAt = prefixLen + remaining - 1;
        ops.push({ timeMs: t, code, cursorPos: cursorAt, editStart: prefixLen, editEnd: cursorAt, phase: "deleting", flushIdx: fi });
      } else {
        const insertCount = s - charsToDelete + 1;
        const code = toCode.slice(0, prefixLen + insertCount) + suffix;
        const cursorAt = prefixLen + insertCount;
        ops.push({ timeMs: t, code, cursorPos: cursorAt, editStart: prefixLen, editEnd: cursorAt, phase: "inserting", flushIdx: fi });
      }
    }

    // Final idle state at end of flush
    ops.push({ timeMs: flushStartMs + flushDurMs, code: toCode, cursorPos: -1, editStart: 0, editEnd: 0, phase: "idle", flushIdx: fi });
  }

  return ops;
}

function ReplayPage() {
  const { courseCode, assignmentId, studentId } = useParams();
  const navigate = useNavigate();
  const [allFlushes, setAllFlushes] = useState<Flush[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilePath, setSelectedFilePath] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [typingState, setTypingState] = useState<TypingState>({ code: "", cursorPos: -1, editStart: 0, editEnd: 0, phase: "idle" });
  const [playheadMs, setPlayheadMs] = useState(0);
  const [currentFlushIdx, setCurrentFlushIdx] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const animFrameRef = useRef<number>(0);
  const playStartRef = useRef<{ wallTime: number; streamTime: number }>({ wallTime: 0, streamTime: 0 });

  useEffect(() => {
    if (!studentId || !assignmentId) return;
    setLoading(true);
    apiFetch<Flush[]>(`/flushes/student/${studentId}?assignment_id=${assignmentId}`)
      .then((data) => {
        const deduped = dedupFlushes(data);
        setAllFlushes(deduped);
        const paths = [...new Set(deduped.map((f) => f.file_path))];
        setSelectedFilePath(paths[0] ?? "");
        setPlayheadMs(0);
      })
      .catch(() => setAllFlushes([]))
      .finally(() => setLoading(false));
  }, [studentId, assignmentId]);

  // Group by file path
  const fileGroups: Record<string, Flush[]> = {};
  for (const f of allFlushes) {
    (fileGroups[f.file_path] ??= []).push(f);
  }
  for (const key of Object.keys(fileGroups)) {
    fileGroups[key].sort((a, b) => a.sequence_number - b.sequence_number);
  }
  const filePaths = Object.keys(fileGroups);
  const currentFlushes = fileGroups[selectedFilePath] ?? [];

  // Build the continuous edit stream (memoized on flushes)
  const editStream = useRef<EditOp[]>([]);
  const editStreamKey = useRef("");
  const streamKey = selectedFilePath + ":" + currentFlushes.length;
  if (editStreamKey.current !== streamKey) {
    editStreamKey.current = streamKey;
    editStream.current = buildEditStream(currentFlushes, reconstructFileAtStep);
  }
  const stream = editStream.current;
  const totalDurationMs = stream.length > 0 ? stream[stream.length - 1].timeMs : 0;

  // Find the edit op at a given time
  const opAtTime = useCallback((timeMs: number): EditOp | null => {
    const s = stream;
    if (s.length === 0) return null;
    const t = Math.max(0, Math.min(timeMs, totalDurationMs));
    // Binary search for the last op at or before t
    let lo = 0, hi = s.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (s[mid].timeMs <= t) lo = mid;
      else hi = mid - 1;
    }
    return s[lo];
  }, [stream, totalDurationMs]);

  // Update display whenever playheadMs changes
  useEffect(() => {
    const op = opAtTime(playheadMs);
    if (op) {
      setTypingState({ code: op.code, cursorPos: op.cursorPos, editStart: op.editStart, editEnd: op.editEnd, phase: op.phase });
      setCurrentFlushIdx(op.flushIdx);
    } else if (currentFlushes.length === 0) {
      setTypingState({ code: "", cursorPos: -1, editStart: 0, editEnd: 0, phase: "idle" });
    }
  }, [playheadMs, opAtTime, currentFlushes.length]);

  // Animation loop for continuous playback
  useEffect(() => {
    if (!isPlaying) return;

    playStartRef.current = { wallTime: performance.now(), streamTime: playheadMs };

    function frame() {
      const elapsed = (performance.now() - playStartRef.current.wallTime) * speed;
      const newTime = playStartRef.current.streamTime + elapsed;

      if (newTime >= totalDurationMs) {
        setPlayheadMs(totalDurationMs);
        setIsPlaying(false);
        return;
      }

      setPlayheadMs(newTime);
      animFrameRef.current = requestAnimationFrame(frame);
    }

    animFrameRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying, speed, totalDurationMs]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "[") {
        setSpeed((s) => { const idx = SPEED_OPTIONS.indexOf(s as typeof SPEED_OPTIONS[number]); return idx > 0 ? SPEED_OPTIONS[idx - 1] : s; });
      } else if (e.key === "]") {
        setSpeed((s) => { const idx = SPEED_OPTIONS.indexOf(s as typeof SPEED_OPTIONS[number]); return idx < SPEED_OPTIONS.length - 1 ? SPEED_OPTIONS[idx + 1] : s; });
      } else if (e.key === " ") {
        e.preventDefault();
        playPause();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isPlaying, totalDurationMs, playheadMs]);

  // When speed changes during playback, reset the wall-time anchor so playback continues smoothly
  useEffect(() => {
    if (isPlaying) {
      playStartRef.current = { wallTime: performance.now(), streamTime: playheadMs };
    }
  }, [speed]);

  function playPause() {
    if (stream.length === 0) return;
    if (isPlaying) { setIsPlaying(false); return; }
    if (playheadMs >= totalDurationMs) setPlayheadMs(0);
    setIsPlaying(true);
  }

  function seekToFlush(idx: number) {
    setIsPlaying(false);
    // Find the first op for this flush index
    if (idx <= 0) { setPlayheadMs(0); return; }
    const firstOp = stream.find((op) => op.flushIdx >= idx && op.phase === "idle");
    setPlayheadMs(firstOp ? firstOp.timeMs : 0);
  }

  function seekToTime(ms: number) {
    setIsPlaying(false);
    setPlayheadMs(Math.max(0, Math.min(ms, totalDurationMs)));
  }

  // Compute current timestamp from flush
  const currentFlush = currentFlushes[currentFlushIdx];
  const currentTime = currentFlush ? new Date(currentFlush.start_timestamp).toLocaleString() : "";

  if (loading) {
    return (
      <main style={{ height: "100vh", display: "grid", placeItems: "center" }}>
        <p style={{ color: "var(--text-muted)" }}>Loading replay data...</p>
      </main>
    );
  }

  return (
    <main style={{ height: "calc(100vh - 0px)", display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
      {/* Header bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 1rem", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
          <button
            className="btn btn-secondary"
            onClick={() => navigate(`/${courseCode}/${assignmentId}`)}
            style={{ padding: "0.35rem 0.8rem", fontSize: 13, fontWeight: 600 }}
            title="Back to assignment"
          >
            ← Back
          </button>
          <div>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Progress Replay</span>
            <span style={{ color: "var(--text-muted)", fontSize: 12, marginLeft: 12 }}>Student: {studentId}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
            {currentTime || "—"}
          </span>
          <button
            className="btn btn-secondary"
            onClick={() => setChatOpen((v) => !v)}
            style={{ padding: "0.35rem 0.7rem", fontSize: 12, fontWeight: 600 }}
            title="Chat with AI about this student"
          >
            {chatOpen ? "Close Chat" : "AI Chat"}
          </button>
        </div>
      </div>

      {/* Main content: file tree + code viewer */}
      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", flex: 1, minHeight: 0, overflow: "hidden", position: "relative" }}>
        {/* File Tree */}
        <aside style={{ borderRight: "1px solid var(--border)", background: "var(--surface)", padding: "0.5rem", overflowY: "auto" }}>
          <h2 style={{ marginTop: 0, fontSize: 13, marginBottom: "0.4rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>Files</h2>
          {filePaths.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 12 }}>No files tracked.</p>
          ) : (
            filePaths.map((fp) => (
              <button
                key={fp}
                onClick={() => { setSelectedFilePath(fp); setPlayheadMs(0); setIsPlaying(false); }}
                style={{
                  display: "block", width: "100%", textAlign: "left", padding: "0.3rem 0.4rem",
                  border: "none", borderRadius: 4, marginBottom: 1,
                  background: selectedFilePath === fp ? "var(--accent-soft)" : "transparent",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 11,
                  cursor: "pointer", color: "inherit",
                }}
              >
                {fp}
              </button>
            ))
          )}
        </aside>

        {/* Code viewer fills remaining space */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          <CodeViewer state={typingState} filePath={selectedFilePath} timestamp={currentTime} />
        </div>

        {/* Chat panel overlay */}
        {chatOpen && studentId && assignmentId && (
          <ChatPanel studentId={studentId} assignmentId={assignmentId} onClose={() => setChatOpen(false)} />
        )}
      </div>

      {/* Bottom: simple progress bar + controls */}
      <div style={{ borderTop: "1px solid var(--border)", background: "var(--surface)", padding: "0.5rem 0.75rem 0.45rem", flexShrink: 0 }}>
        {/* Day jump chips */}
        {(() => {
          const sessions = detectSessions(currentFlushes);
          if (sessions.length <= 1) return null;
          return (
            <div style={{ display: "flex", gap: 4, marginBottom: 6, flexWrap: "wrap" }}>
              {sessions.map((s, i) => {
                const isActive = currentFlushIdx >= s.idx && (i + 1 >= sessions.length || currentFlushIdx < sessions[i + 1].idx);
                return (
                  <button
                    key={i}
                    onClick={() => seekToFlush(s.idx)}
                    style={{
                      padding: "2px 10px",
                      fontSize: 11,
                      fontWeight: 600,
                      border: "1px solid var(--border)",
                      borderRadius: 999,
                      background: isActive ? "var(--accent)" : "transparent",
                      color: isActive ? "#fff" : "var(--text-muted)",
                      cursor: "pointer",
                    }}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          );
        })()}

        {/* Continuous progress slider */}
        <input
          type="range"
          min={0}
          max={totalDurationMs || 1}
          value={playheadMs}
          onChange={(e) => seekToTime(Number(e.target.value))}
          style={{
            width: "100%",
            height: 6,
            appearance: "none",
            WebkitAppearance: "none",
            background: `linear-gradient(to right, var(--accent) ${totalDurationMs > 0 ? (playheadMs / totalDurationMs) * 100 : 0}%, var(--border) ${totalDurationMs > 0 ? (playheadMs / totalDurationMs) * 100 : 0}%)`,
            borderRadius: 3,
            outline: "none",
            cursor: "pointer",
            display: "block",
            margin: "0 0 6px",
          }}
        />

        {/* Controls row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Transport controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <button className="btn-icon" onClick={() => seekToTime(0)} disabled={playheadMs === 0} title="Skip to start" style={{ width: 28, height: 28, display: "grid", placeItems: "center" }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="2" height="10" fill="currentColor" /><path d="M12 3L5 8L12 13V3Z" fill="currentColor" /></svg>
            </button>
            <button className="btn-icon btn-icon-lg" onClick={playPause} disabled={stream.length === 0} title={isPlaying ? "Pause" : "Play"} style={{ width: 34, height: 34, borderRadius: 999, display: "grid", placeItems: "center" }}>
              {isPlaying ? (
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="3" y="2" width="3" height="12" fill="currentColor" /><rect x="10" y="2" width="3" height="12" fill="currentColor" /></svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 2L13 8L4 14V2Z" fill="currentColor" /></svg>
              )}
            </button>
            <button className="btn-icon" onClick={() => seekToTime(totalDurationMs)} disabled={playheadMs >= totalDurationMs} title="Skip to end" style={{ width: 28, height: 28, display: "grid", placeItems: "center" }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="12" y="3" width="2" height="10" fill="currentColor" /><path d="M4 3L11 8L4 13V3Z" fill="currentColor" /></svg>
            </button>
          </div>

          {/* Time display */}
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums", fontFamily: "ui-monospace, monospace" }}>
            {formatDuration(playheadMs)} / {formatDuration(totalDurationMs)}
          </span>

          {/* Speed selector */}
          <div style={{ display: "flex", borderRadius: 999, overflow: "hidden", border: "1px solid var(--border)" }}>
            {SPEED_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                style={{
                  padding: "0.15rem 0.45rem", border: "none", fontSize: 10, fontWeight: 700,
                  background: speed === s ? "var(--accent)" : "transparent",
                  color: speed === s ? "#fff" : "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function GenericPage({ title, body }: { title: string; body: string }) {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "1.5rem 1.1rem 2rem" }}>
      <div style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", padding: "1.5rem 1.75rem" }}>
        <h1 style={{ marginTop: 0 }}>{title}</h1>
        <p style={{ color: "var(--text-muted)", lineHeight: 1.65, marginBottom: 0 }}>{body}</p>
      </div>
    </main>
  );
}

function FaqPage() {
  const faqItems = [
    {
      question: "What is JumBuddy?",
      answer:
        "A tool for Professors and TAs that reveals the process that students use to implement their Computer Science homeworks/projects.",
    },
    {
      question: "Why JumBuddy?",
      answer:
        "There is a lack of information for the specifics of how students actually implement their code while doing their work. By being able to see the specifics of student workflow, JumBuddy , is able to send Professors and TAs an individualized account of students implementation process, time spent per function, and a summary containing specific areas of need, while also being able to see the larger picture of the needs of the class at large.",
    },
    {
      question: "What does JumBuddy do?",
      answer: "It contains information for both individual students and the class:",
      bullets: [
        "The total amount of time spent on the project.",
        "The time spent in individual functions",
        "AI overview of each student.",
        "A replay of student implementation of their code.",
      ],
    },
    {
      question: "How can JumBuddy help?",
      answer:
        "By being able to see individual student’s process, instructors can properly gauge what topics may need more attention during class periods, lab sessions, and office hours. JumBuddy can also aid the professor by giving a truly holistic view of the student body’s average completion time for specific files and functions.",
    },
    {
      question: "Does JumBuddy detect cheating?",
      answer:
        "Not entirely. With an issue as complicated as cheating, this program is unable to give a definitive yes or no. However, many of the tools may be able to help give information on whether or not a student is cheating. By being able to see the time it actually takes a student to complete an assignment, compared to the class, and the actual process that a student implements their code, JumBuddy can be an important tool for determining if a student did or didn’t violate academic integrity policies.",
    },
  ];

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "1.5rem 1.1rem 2rem" }}>
      <div style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", padding: "1.5rem 1.75rem" }}>
        <h1 style={{ marginTop: 0, marginBottom: "1.25rem" }}>FAQ</h1>

        <section style={{ display: "grid", gap: "0.9rem" }}>
          {faqItems.map((item) => (
            <article
              key={item.question}
              style={{
                border: "1px solid var(--border-soft)",
                background: "var(--surface-muted)",
                borderRadius: 10,
                padding: "0.95rem 1rem",
              }}
            >
              <h2 style={{ margin: "0 0 0.45rem", fontSize: 20 }}>{item.question}</h2>
              <p style={{ margin: 0, color: "var(--text-muted)", lineHeight: 1.65 }}>{item.answer}</p>
              {item.bullets && (
                <ul style={{ margin: "0.65rem 0 0", color: "var(--text-muted)", lineHeight: 1.65, paddingLeft: "1.15rem" }}>
                  {item.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

function AboutPage() {
  const aboutItems = [
    {
      title: (
        <>
          View full file history <strong>exactly</strong> as the student created it.
        </>
      ),
      body:
        "Replay a student's development process step by step, including incremental edits, deletions, and rewrites. This provides instructors with insight into problem-solving strategies rather than just the final submitted solution.",
    },
    {
      title: (
        <>
          <strong>Generate</strong> LLM-assisted qualitative insights from student metrics.
        </>
      ),
      body:
        "Translate raw editing patterns into readable summaries that highlight confusion, iteration cycles, or stalled progress. These insights help instructors quickly interpret behavioral data without manually parsing logs.",
    },
    {
      title: (
        <>
          <strong>Understand</strong> classwide trends in implementation struggles by specific function, file, or concept.
        </>
      ),
      body:
        "Combine editing data to reveal patterns across the class. Professors can see which topics students struggle with most and adjust their teaching accordingly.",
    },
    {
      title: (
        <>
          <strong>Provide</strong> a jumping-off point for TA assistance in office hours.
        </>
      ),
      body:
        "Like a nurse taking vitals before the doctor arrives, JumBuddy can give TAs a quick snapshot of a student's coding “symptoms” before the conversation begins. This helps them diagnose the real issue faster and spend more time treating the root problem instead of gathering background information.",
    },
  ];

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "1.5rem 1.1rem 2rem" }}>
      <div style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", padding: "1.5rem 1.75rem" }}>
        <h1 style={{ marginTop: 0, marginBottom: "0.4rem" }}>About Our Product</h1>
        <p style={{ color: "var(--text-muted)", lineHeight: 1.65, marginTop: 0, marginBottom: "1.25rem" }}>
          There’s a gap between CS instructors and fully understanding students’ struggles. JumBuddy looks at raw student IDE input and analyzes the files and functions edited and the frequency and fluidity of the edits in order to quantify and create metrics so professors can evaluate the effectiveness of their teaching methods. for understanding.
        </p>

        <section style={{ display: "grid", gap: "0.9rem" }}>
          {aboutItems.map((item, idx) => (
            <article
              key={idx}
              style={{
                border: "1px solid var(--border-soft)",
                background: "var(--surface-muted)",
                borderRadius: 10,
                padding: "0.95rem 1rem",
              }}
            >
              <h2 style={{ margin: "0 0 0.45rem", fontSize: 20 }}>{item.title}</h2>
              <p style={{ margin: 0, color: "var(--text-muted)", lineHeight: 1.65 }}>{item.body}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

function NotFoundPage() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "1.5rem 1.1rem 2rem" }}>
      <div style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", padding: "1.5rem 1.75rem" }}>
        <h1 style={{ marginTop: 0 }}>Not Found</h1>
        <p style={{ color: "var(--text-muted)" }}>This page does not exist.</p>
        <Link to="/" className="btn btn-primary" style={{ display: "inline-block", padding: "0.55rem 1.1rem", borderRadius: 8, color: "white", textDecoration: "none" }}>
          Back Home
        </Link>
      </div>
    </main>
  );
}

function AuthedApp({
  onSignOut,
  theme,
  onToggleTheme,
}: {
  onSignOut: () => Promise<void>;
  theme: ThemeMode;
  onToggleTheme: () => void;
}) {
  const [courses, setCourses] = useState<CourseWithRole[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => localStorage.getItem("jumbuddy-sidebar-collapsed") === "true");

  useEffect(() => {
    apiFetch<CourseWithRole[]>("/courses/my")
      .then(setCourses)
      .catch(() => setCourses([]));
  }, []);

  useEffect(() => {
    localStorage.setItem("jumbuddy-sidebar-collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const firstCode = courses[0]?.course.code;

  return (
    <div style={appShellStyle} className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <Navbar
        courses={courses}
        onSignOut={onSignOut}
        theme={theme}
        onToggleTheme={onToggleTheme}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
      />
      <div className="content-shell">
        <Routes>
          <Route path="/" element={firstCode ? <Navigate to={`/${firstCode}`} replace /> : <main style={{ padding: "2rem" }}><p style={{ color: "var(--text-muted)" }}>No courses found. Contact your administrator.</p></main>} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/account" element={<GenericPage title="Account" body="Account settings can be connected here. Current demo includes authentication via Supabase and role-aware course navigation." />} />
          <Route path="/:courseCode" element={<CoursePage courses={courses} />} />
          <Route path="/:courseCode/:assignmentId" element={<AssignmentPage courses={courses} />} />
          <Route path="/:courseCode/:assignmentId/:studentId" element={<ReplayPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem("jumbuddy-theme");
    return saved === "light" ? "light" : "dark";
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("jumbuddy-theme", theme);
  }, [theme]);

  async function handleLogin(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  const location = useLocation();

  if (!session) {
    if (location.pathname === "/login") {
      return <LoginPage onLogin={handleLogin} />;
    }
    return <Navigate to="/login" replace />;
  }

  if (location.pathname === "/login") {
    return <Navigate to="/" replace />;
  }

  return (
    <AuthedApp
      onSignOut={handleSignOut}
      theme={theme}
      onToggleTheme={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
    />
  );
}

export default App;
