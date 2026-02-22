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
type NavIconName = "faq" | "about" | "account";

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
      <div style={{ padding: "1rem 0.9rem 0.6rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
        <div style={{ fontWeight: 800, letterSpacing: 0.5, fontSize: 30, lineHeight: 1.1 }}>
          <span className="brand-label">JumBuddy</span>
          <span className="brand-mini">JB</span>
        </div>
      </div>
      <nav className="sidebar-nav" style={{ display: "grid", gap: "0.25rem", padding: "0.8rem 0.6rem", alignContent: "start" }}>
        {courses.length > 0 && (
          <>
            <div className="nav-label" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", padding: "0.25rem 0.35rem", letterSpacing: 1 }}>
              Courses
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
                  <span className="nav-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M3 11.5 12 4l9 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M6 10.5V20h12v-9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="nav-label">{code}</span>
                </Link>
              );
            })}
          </>
        )}
        <div style={{ marginTop: "1rem" }} />
        {bottomItems.map((item) => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-link ${active ? "nav-link--active" : ""}`}
              data-tooltip={item.label}
              aria-label={item.label}
            >
              <span className="nav-icon">{renderNavIcon(item.icon)}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>
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
  const [email, setEmail] = useState("professor@jumbuddy.test");
  const [password, setPassword] = useState("testpass123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const nextError = await onLogin(email, password);
    if (nextError) {
      setError(nextError);
    } else {
      navigate("/", { replace: true });
    }
    setLoading(false);
  }

  return (
    <div style={{ height: "100vh", display: "grid", gridTemplateColumns: "minmax(320px, 420px) 1fr", background: "var(--bg-page)" }}>
      <section style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "2.5rem", background: "var(--surface)", borderRight: "1px solid var(--border)" }}>
        <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: 0.5, lineHeight: 1, marginBottom: "1.5rem" }}>JumBuddy</div>
        <form onSubmit={submit}>
          <label style={{ display: "block", marginBottom: "0.35rem", fontWeight: 600 }}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", padding: "0.7rem", borderRadius: 8, border: "1px solid var(--border)", marginBottom: "0.8rem" }} />
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

const HEATMAP_CATEGORIES = ["Time Spent", "Error Rate", "Retries", "Idle Gaps"];

function seedHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function struggleColor(value: number): string {
  // 0=green, 50=yellow, 100=red via HSL
  const hue = value <= 50
    ? 142 - (142 - 45) * (value / 50)
    : 45 - 45 * ((value - 50) / 50);
  const sat = 70 + 15 * (value / 100);
  const light = 48 - 8 * (value / 100);
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

function StruggleHeatmap({
  students,
  categories: categoriesProp,
  values: valuesProp,
  onCellClick,
}: {
  students: StudentEntry[];
  categories?: string[];
  values?: number[][];
  onCellClick: (studentName: string, category: string, value: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ row: number; col: number; x: number; y: number } | null>(null);

  const CELL_W = 72;
  const CELL_H = 36;
  const GAP = 3;
  const RADIUS = 6;
  const LABEL_W = 120;
  const HEADER_H = 28;
  const categories = categoriesProp ?? HEATMAP_CATEGORIES;

  // Use provided values or generate deterministic ones
  const values: number[][] = valuesProp ?? students.map((s) =>
    categories.map((cat) => seedHash(s.profile_id + cat) % 101)
  );

  const canvasW = LABEL_W + categories.length * (CELL_W + GAP) - GAP;
  const canvasH = HEADER_H + students.length * (CELL_H + GAP) - GAP;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;
    canvas.style.width = `${canvasW}px`;
    canvas.style.height = `${canvasH}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // Read theme colors
    const style = getComputedStyle(document.documentElement);
    const textColor = style.getPropertyValue("--text-primary").trim() || "#2d2a26";
    const mutedColor = style.getPropertyValue("--text-muted").trim() || "#6c655d";

    ctx.clearRect(0, 0, canvasW, canvasH);

    // Column headers
    ctx.font = "600 11px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = mutedColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    for (let c = 0; c < categories.length; c++) {
      const x = LABEL_W + c * (CELL_W + GAP) + CELL_W / 2;
      ctx.fillText(categories[c], x, HEADER_H - 4);
    }

    // Rows
    for (let r = 0; r < students.length; r++) {
      const y = HEADER_H + r * (CELL_H + GAP);

      // Row label
      ctx.font = "600 12px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = textColor;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      const name = students[r].display_name ?? students[r].utln;
      ctx.fillText(name.length > 14 ? name.slice(0, 13) + "..." : name, LABEL_W - 10, y + CELL_H / 2);

      // Cells
      for (let c = 0; c < categories.length; c++) {
        const x = LABEL_W + c * (CELL_W + GAP);
        const val = values[r][c];
        const isHovered = hover?.row === r && hover?.col === c;

        // Rounded rect
        ctx.beginPath();
        ctx.roundRect(x, y, CELL_W, CELL_H, RADIUS);
        ctx.fillStyle = struggleColor(val);
        ctx.fill();

        if (isHovered) {
          ctx.strokeStyle = style.getPropertyValue("--accent").trim() || "#3d5f85";
          ctx.lineWidth = 2;
          ctx.stroke();
          // Brighten overlay
          ctx.fillStyle = "rgba(255,255,255,0.15)";
          ctx.fill();
        }

        // Value text
        ctx.font = "700 13px system-ui, -apple-system, sans-serif";
        ctx.fillStyle = val >= 40 ? "#fff" : "rgba(0,0,0,0.8)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(val), x + CELL_W / 2, y + CELL_H / 2);
      }
    }
  }, [students, hover, canvasW, canvasH, values]);

  // Draw on mount and when hover/theme changes
  useEffect(() => {
    draw();
  }, [draw]);

  // Observe theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => draw());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, [draw]);

  function hitTest(e: React.MouseEvent): { row: number; col: number } | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    for (let r = 0; r < students.length; r++) {
      for (let c = 0; c < categories.length; c++) {
        const x = LABEL_W + c * (CELL_W + GAP);
        const y = HEADER_H + r * (CELL_H + GAP);
        if (mx >= x && mx <= x + CELL_W && my >= y && my <= y + CELL_H) {
          return { row: r, col: c };
        }
      }
    }
    return null;
  }

  function handleMouseMove(e: React.MouseEvent) {
    const hit = hitTest(e);
    if (hit) {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      setHover({ ...hit, x: e.clientX - rect.left, y: e.clientY - rect.top });
    } else {
      setHover(null);
    }
  }

  function handleClick(e: React.MouseEvent) {
    const hit = hitTest(e);
    if (hit) {
      const name = students[hit.row].display_name ?? students[hit.row].utln;
      onCellClick(name, categories[hit.col], values[hit.row][hit.col]);
    }
  }

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
        onClick={handleClick}
        style={{ cursor: hover ? "pointer" : "default", display: "block" }}
      />
      {hover && (
        <div
          ref={tooltipRef}
          style={{
            position: "absolute",
            left: hover.x + 12,
            top: hover.y - 8,
            background: "var(--text-primary)",
            color: "var(--bg-app)",
            padding: "4px 10px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 10,
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
          }}
        >
          {students[hover.row].display_name ?? students[hover.row].utln} — {categories[hover.col]}: {values[hover.row][hover.col]}
        </div>
      )}
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
    { label: "Time on Assignment", value: studentAnalysis ? formatTime(studentAnalysis.total_time_sec) : "—" },
    { label: "Top Struggle Area", value: topLinger ? `${topLinger.symbol} (${topLinger.linger_score})` : "—" },
    { label: "Current Focus", value: topFocus ? topFocus.symbol : "—" },
    { label: "Avg Churn Rate", value: avgChurn },
  ];

  // Derive heatmap categories from class struggle topics
  const heatmapSymbols = classAnalysis?.struggle_topics?.slice(0, 6).map((t) => t.symbol) ?? HEATMAP_CATEGORIES;

  // Build per-student values for those symbols from student_lingers
  const heatmapValues: number[][] = students.map((s) => {
    const lingers = classAnalysis?.student_lingers?.[s.profile_id] ?? [];
    return heatmapSymbols.map((sym) => {
      const match = lingers.find((l) => l.symbol.toLowerCase() === sym.toLowerCase());
      return match ? Math.min(Math.round(match.linger_score * 10), 100) : 0;
    });
  });

  const classStats = [
    { label: "Students Tracked", value: classAnalysis ? String(classAnalysis.student_count) : "—" },
    { label: "Total Flushes", value: classAnalysis ? String(classAnalysis.total_flushes) : "—" },
    { label: "Top Struggle Symbol", value: classAnalysis?.struggle_topics?.[0]?.symbol ?? "—" },
    { label: "Struggling Students", value: classAnalysis?.struggle_topics?.[0] ? String(classAnalysis.struggle_topics[0].student_count) : "—" },
  ];

  return (
    <main style={{ maxWidth: 1240, margin: "0 auto", padding: "1rem 1.1rem 2rem" }}>
      <h1 style={{ marginBottom: "0.3rem" }}>{assignmentName || "Assignment"}</h1>
      <p style={{ marginTop: 0, color: "var(--text-muted)" }}>{courseEntry.course.name} • {courseEntry.course.code}</p>

      <div style={{ display: "grid", gridTemplateColumns: "260px minmax(380px, 1fr)", gap: "1rem" }}>
        {/* Student sidebar */}
        <aside style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", padding: "0.8rem" }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Students</h2>
          {!loading && students.length > 0 && (
            <input
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Search by UTLN..."
              style={{ width: "100%", padding: "0.45rem 0.6rem", marginBottom: "0.6rem", borderRadius: 6, border: "1px solid var(--border)", fontSize: 13 }}
            />
          )}
          {loading ? (
            <p style={{ color: "var(--text-muted)" }}>Loading...</p>
          ) : students.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>No students enrolled.</p>
          ) : (() => {
            const filtered = students.filter((s) =>
              s.utln.toLowerCase().includes(studentSearch.toLowerCase())
            );
            const MAX_VISIBLE = 8;
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
                      padding: "0.4rem 0.5rem", marginBottom: 2, borderRadius: 6, cursor: "pointer",
                      background: selectedStudentId === s.profile_id ? "var(--accent-soft)" : "transparent",
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{s.utln}</span>
                    <Link
                      to={`/${courseCode}/${assignmentId}/${s.profile_id}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}
                    >
                      Replay
                    </Link>
                  </div>
                ))}
                {remaining > 0 && (
                  <p style={{ margin: "0.4rem 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                    +{remaining} more — search to find
                  </p>
                )}
                {filtered.length === 0 && (
                  <p style={{ margin: "0.4rem 0 0", fontSize: 12, color: "var(--text-muted)" }}>No matches.</p>
                )}
              </>
            );
          })()}
        </aside>

        {/* Right content area */}
        <section style={{ display: "grid", gap: "1rem" }}>
          {/* Student stats */}
          <section style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", padding: "1rem" }}>
            <h2 style={{ marginTop: 0, marginBottom: "0.3rem" }}>Student Assignment Stats: {selectedStudent?.display_name ?? selectedStudent?.utln ?? "—"}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 1fr) minmax(260px, 1.1fr)", gap: "1rem" }}>
              <div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {studentStats.map((item) => (
                    <li key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--border-soft)" }}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </li>
                  ))}
                </ul>
                {/* Linger breakdown table */}
                {studentAnalysis && studentAnalysis.linger.length > 0 && (
                  <div style={{ marginTop: "0.8rem" }}>
                    <h4 style={{ margin: "0 0 0.3rem", fontSize: 13, color: "var(--text-muted)" }}>Top Struggle Symbols</h4>
                    <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border-soft)" }}>
                          <th style={{ textAlign: "left", padding: "0.25rem 0" }}>Symbol</th>
                          <th style={{ textAlign: "right", padding: "0.25rem 0" }}>Time</th>
                          <th style={{ textAlign: "right", padding: "0.25rem 0" }}>Visits</th>
                          <th style={{ textAlign: "right", padding: "0.25rem 0" }}>Churn</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentAnalysis.linger.slice(0, 5).map((l, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                            <td style={{ padding: "0.25rem 0", fontFamily: "monospace" }}>{l.symbol}</td>
                            <td style={{ textAlign: "right", padding: "0.25rem 0" }}>{formatTime(l.dwell_time)}</td>
                            <td style={{ textAlign: "right", padding: "0.25rem 0" }}>{l.visits}</td>
                            <td style={{ textAlign: "right", padding: "0.25rem 0" }}>{l.churn}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div style={{ border: "1px solid var(--border-soft)", borderRadius: 8, padding: "0.75rem", background: "var(--surface-muted)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <h3 style={{ margin: 0, fontSize: 16 }}>AI Work Analysis</h3>
                  <button
                    className="btn btn-primary"
                    onClick={generateAIReport}
                    disabled={!selectedStudentId || reportLoading}
                    style={{ padding: "0.35rem 0.8rem", fontSize: 13, fontWeight: 600 }}
                  >
                    {reportLoading ? "Generating..." : "Generate Report"}
                  </button>
                </div>
                {aiReport ? (
                  <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "0.6rem", marginTop: "0.5rem" }}>
                    <p style={{ margin: 0, lineHeight: 1.5, whiteSpace: "pre-wrap", fontSize: 14 }}>{aiReport}</p>
                  </div>
                ) : (
                  <p style={{ margin: 0, color: "var(--text-muted)", lineHeight: 1.35, fontSize: 13 }}>
                    Click "Generate Report" to analyze this student's workflow, struggles, and productivity based on their actual code changes.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Class stats */}
          <section style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", padding: "1rem" }}>
            <h2 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Overall Class Statistics</h2>
            <ul style={{ listStyle: "none", margin: "0 0 0.8rem", padding: 0 }}>
              {classStats.map((item) => (
                <li key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "0.45rem 0", borderBottom: "1px solid var(--border-soft)" }}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </li>
              ))}
            </ul>

            <h3 style={{ marginTop: "0.8rem", marginBottom: "0.4rem" }}>Function/Symbol Struggle Heatmap</h3>
            <p style={{ marginTop: 0, marginBottom: "0.6rem", color: "var(--text-muted)" }}>Higher values indicate more struggle. Click a cell for details.</p>

            {students.length > 0 && classAnalysis && (
              <div style={{ overflowX: "auto", padding: "0.25rem 0" }}>
                <StruggleHeatmap
                  students={students}
                  categories={heatmapSymbols}
                  values={heatmapValues}
                  onCellClick={(name, category, value) => {
                    const studentLingers = classAnalysis?.student_lingers ?? {};
                    const sid = students.find((s) => (s.display_name ?? s.utln) === name)?.profile_id;
                    const lingers = sid ? studentLingers[sid] : undefined;
                    const match = lingers?.find((l) => l.symbol.toLowerCase() === category.toLowerCase());
                    if (match) {
                      setNarrative(`${name} visited ${match.symbol} ${match.visits} times over ${formatTime(match.dwell_time)} with churn rate ${match.churn}`);
                    } else {
                      setNarrative(`${name} — ${category} (score: ${value}): No significant activity detected.`);
                    }
                  }}
                />
              </div>
            )}

            {students.length > 0 && !classAnalysis && (
              <div style={{ overflowX: "auto", padding: "0.25rem 0" }}>
                <StruggleHeatmap
                  students={students}
                  onCellClick={(name, category, value) =>
                    setNarrative(`${name} — ${category} (score: ${value}): Loading analysis...`)
                  }
                />
              </div>
            )}

            <div style={{ marginTop: "0.8rem", border: "1px solid var(--border-soft)", borderRadius: 8, background: "var(--surface-muted)", padding: "0.75rem" }}>
              <h4 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Cell Details</h4>
              <p style={{ margin: 0, lineHeight: 1.4, fontSize: 13 }}>{narrative}</p>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function ReplayTimeline({
  flushes,
  stepIndex,
  onSeek,
}: {
  flushes: Flush[];
  stepIndex: number;
  onSeek: (idx: number) => void;
}) {
  const mainRef = useRef<HTMLCanvasElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Compute cumulative positions for each flush (normalized 0..1)
  const totalDur = flushes.reduce((s, f) => s + Math.max(f.window_duration || 0.5, 0.5), 0);
  const positions: number[] = [];
  let cum = 0;
  for (const f of flushes) {
    positions.push(cum / totalDur);
    cum += Math.max(f.window_duration || 0.5, 0.5);
  }

  // Session detection
  type Session = { startIdx: number; endIdx: number; label: string };
  const sessions: Session[] = [];
  if (flushes.length > 0) {
    let sStart = 0;
    for (let i = 1; i < flushes.length; i++) {
      const gap = new Date(flushes[i].start_timestamp).getTime() - new Date(flushes[i - 1].end_timestamp).getTime();
      if (gap > 30 * 60 * 1000) {
        sessions.push({ startIdx: sStart, endIdx: i - 1, label: new Date(flushes[sStart].start_timestamp).toLocaleDateString() });
        sStart = i;
      }
    }
    sessions.push({ startIdx: sStart, endIdx: flushes.length - 1, label: new Date(flushes[sStart].start_timestamp).toLocaleDateString() });
  }

  const MAIN_H = 48;
  const MINI_H = 12;

  // Hit test: x pixel on main canvas → flush index
  const xToIdx = useCallback((x: number, canvasW: number): number => {
    const viewStart = panX;
    const viewEnd = panX + 1 / zoom;
    const norm = viewStart + (x / canvasW) * (viewEnd - viewStart);
    let best = 0;
    for (let i = 0; i < positions.length; i++) {
      if (positions[i] <= norm) best = i;
    }
    return best;
  }, [panX, zoom, positions]);

  const drawMain = useCallback(() => {
    const canvas = mainRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    canvas.width = w * dpr;
    canvas.height = MAIN_H * dpr;
    canvas.style.height = `${MAIN_H}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const style = getComputedStyle(document.documentElement);
    const accent = style.getPropertyValue("--accent").trim() || "#3d5f85";
    const accentSoft = style.getPropertyValue("--accent-soft-2").trim() || "#c8d8e8";
    const borderCol = style.getPropertyValue("--border").trim() || "#d7d0c4";
    const mutedText = style.getPropertyValue("--text-muted").trim() || "#6c655d";
    const surfaceMuted = style.getPropertyValue("--surface-muted").trim() || "#f3f0e8";

    ctx.clearRect(0, 0, w, MAIN_H);

    const viewStart = panX;
    const viewEnd = panX + 1 / zoom;

    // Draw session backgrounds
    for (const session of sessions) {
      const sNorm = positions[session.startIdx];
      const eFlush = flushes[session.endIdx];
      const eNorm = (positions[session.endIdx] + Math.max(eFlush.window_duration || 0.5, 0.5) / totalDur);
      const sx = ((sNorm - viewStart) / (viewEnd - viewStart)) * w;
      const ex = ((eNorm - viewStart) / (viewEnd - viewStart)) * w;
      if (ex < 0 || sx > w) continue;
      ctx.fillStyle = surfaceMuted;
      ctx.fillRect(Math.max(sx, 0), 0, Math.min(ex, w) - Math.max(sx, 0), MAIN_H);
      // Session label
      if (ex - sx > 60) {
        ctx.font = "600 9px system-ui, sans-serif";
        ctx.fillStyle = mutedText;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(session.label, Math.max(sx + 4, 2), 2);
      }
    }

    // Draw flush bars
    for (let i = 0; i < flushes.length; i++) {
      const f = flushes[i];
      const dur = Math.max(f.window_duration || 0.5, 0.5);
      const startN = positions[i];
      const endN = startN + dur / totalDur;
      const sx = ((startN - viewStart) / (viewEnd - viewStart)) * w;
      const ex = ((endN - viewStart) / (viewEnd - viewStart)) * w;
      if (ex < 0 || sx > w) continue;
      const barW = Math.max(ex - sx, 2);
      ctx.fillStyle = i === stepIndex ? accent : accentSoft;
      ctx.beginPath();
      ctx.roundRect(Math.max(sx, 0), 14, Math.min(barW, w - Math.max(sx, 0)), MAIN_H - 18, 3);
      ctx.fill();
    }

    // Draw playhead
    if (stepIndex >= 0 && stepIndex < positions.length) {
      const pN = positions[stepIndex];
      const px = ((pN - viewStart) / (viewEnd - viewStart)) * w;
      if (px >= 0 && px <= w) {
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, MAIN_H);
        ctx.stroke();
        // Playhead triangle
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.moveTo(px - 5, 0);
        ctx.lineTo(px + 5, 0);
        ctx.lineTo(px, 7);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Border
    ctx.strokeStyle = borderCol;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, MAIN_H - 1);
  }, [flushes, stepIndex, panX, zoom, positions, sessions, totalDur]);

  const drawMini = useCallback(() => {
    const canvas = miniRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    canvas.width = w * dpr;
    canvas.height = MINI_H * dpr;
    canvas.style.height = `${MINI_H}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const style = getComputedStyle(document.documentElement);
    const accent = style.getPropertyValue("--accent").trim() || "#3d5f85";
    const accentSoft = style.getPropertyValue("--accent-soft-2").trim() || "#c8d8e8";
    const borderCol = style.getPropertyValue("--border").trim() || "#d7d0c4";

    ctx.clearRect(0, 0, w, MINI_H);

    // Draw all flushes as tiny bars
    for (let i = 0; i < flushes.length; i++) {
      const f = flushes[i];
      const dur = Math.max(f.window_duration || 0.5, 0.5);
      const sx = positions[i] * w;
      const ex = (positions[i] + dur / totalDur) * w;
      ctx.fillStyle = i === stepIndex ? accent : accentSoft;
      ctx.fillRect(sx, 1, Math.max(ex - sx, 1), MINI_H - 2);
    }

    // Viewport rectangle
    const vx = panX * w;
    const vw = (1 / zoom) * w;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vx, 0, vw, MINI_H);

    ctx.strokeStyle = borderCol;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(0, 0, w, MINI_H);
  }, [flushes, stepIndex, panX, zoom, positions, totalDur]);

  useEffect(() => { drawMain(); drawMini(); }, [drawMain, drawMini]);

  // Theme observer
  useEffect(() => {
    const obs = new MutationObserver(() => { drawMain(); drawMini(); });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, [drawMain, drawMini]);

  // Resize observer
  useEffect(() => {
    const ro = new ResizeObserver(() => { drawMain(); drawMini(); });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [drawMain, drawMini]);

  // Mouse handlers for main canvas
  function handleMainMouseDown(e: React.MouseEvent) {
    const canvas = mainRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    onSeek(xToIdx(x, rect.width));
    setIsDragging(true);
  }

  function handleMainMouseMove(e: React.MouseEvent) {
    if (!isDragging) return;
    const canvas = mainRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    onSeek(xToIdx(x, rect.width));
  }

  function handleMainMouseUp() {
    setIsDragging(false);
  }

  // Wheel zoom
  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    const canvas = mainRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseNorm = panX + ((e.clientX - rect.left) / rect.width) * (1 / zoom);

    const factor = e.deltaY < 0 ? 1.3 : 1 / 1.3;
    const newZoom = Math.max(1, Math.min(zoom * factor, Math.max(flushes.length, 10)));
    const newPan = Math.max(0, Math.min(mouseNorm - ((e.clientX - rect.left) / rect.width) * (1 / newZoom), 1 - 1 / newZoom));
    setZoom(newZoom);
    setPanX(newPan);
  }

  // Minimap click
  function handleMiniClick(e: React.MouseEvent) {
    const canvas = miniRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickNorm = (e.clientX - rect.left) / rect.width;
    const halfView = (1 / zoom) / 2;
    setPanX(Math.max(0, Math.min(clickNorm - halfView, 1 - 1 / zoom)));
  }

  return (
    <div ref={containerRef} style={{ userSelect: "none" }}>
      {/* Minimap */}
      <canvas
        ref={miniRef}
        onClick={handleMiniClick}
        style={{ width: "100%", height: MINI_H, cursor: "pointer", display: "block", marginBottom: 4, borderRadius: 4 }}
      />
      {/* Main timeline */}
      <canvas
        ref={mainRef}
        onMouseDown={handleMainMouseDown}
        onMouseMove={handleMainMouseMove}
        onMouseUp={handleMainMouseUp}
        onMouseLeave={handleMainMouseUp}
        onWheel={handleWheel}
        style={{ width: "100%", height: MAIN_H, cursor: isDragging ? "grabbing" : "pointer", display: "block", borderRadius: 8 }}
      />
    </div>
  );
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
    <div style={{ border: "1px solid #1e293b", borderRadius: 8, background: "#1a1a2e", padding: "0.75rem", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <style>{`@keyframes cursor-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }`}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem", flexShrink: 0 }}>
        <code style={{ color: "#8892b0", fontSize: 12 }}>{filePath || "—"}</code>
        <span style={{ color: "#5a6785", fontSize: 11 }}>{timestamp}</span>
      </div>
      <div
        ref={codeRef}
        style={{
          margin: 0, color: "#ccd6f6", flex: 1, overflowY: "auto", minHeight: 0,
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

const SPEED_OPTIONS = [1, 2, 4, 8, 16, 100, 500] as const;

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Compute per-flush "density" (how much changed) for the bottom bar gradient */
function computeDensities(flushes: Flush[]): number[] {
  if (flushes.length === 0) return [];
  // Use diff length as a proxy for change density
  const raw = flushes.map((f) => f.diffs.length);
  const maxVal = Math.max(...raw, 1);
  return raw.map((v) => v / maxVal);
}

/** Density bar: renders a horizontal gradient strip colored by change density */
function DensityBar({ flushes, stepIndex, onSeek }: { flushes: Flush[]; stepIndex: number; onSeek: (idx: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const densities = computeDensities(flushes);
  const BAR_H = 6;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    canvas.width = w * dpr;
    canvas.height = BAR_H * dpr;
    canvas.style.height = `${BAR_H}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, BAR_H);

    if (flushes.length === 0) return;

    const segW = w / flushes.length;
    for (let i = 0; i < flushes.length; i++) {
      const d = densities[i];
      // Low density = cool blue, high density = hot orange/red
      const hue = 220 - d * 200; // 220 (blue) → 20 (red-orange)
      const sat = 50 + d * 40;
      const light = 55 - d * 15;
      ctx.fillStyle = `hsl(${hue}, ${sat}%, ${light}%)`;
      ctx.fillRect(i * segW, 0, Math.ceil(segW) + 1, BAR_H);
    }

    // Playhead marker
    if (stepIndex >= 0 && stepIndex < flushes.length) {
      const px = (stepIndex + 0.5) * segW;
      ctx.fillStyle = "#fff";
      ctx.fillRect(px - 1, 0, 2, BAR_H);
    }
  }, [flushes, stepIndex, densities]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const ro = new ResizeObserver(() => draw());
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, [draw]);

  function handleClick(e: React.MouseEvent) {
    const canvas = canvasRef.current;
    if (!canvas || flushes.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const idx = Math.min(Math.floor((x / rect.width) * flushes.length), flushes.length - 1);
    onSeek(Math.max(0, idx));
  }

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      style={{ width: "100%", height: BAR_H, cursor: "pointer", display: "block", borderRadius: 3 }}
    />
  );
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
  const [allFlushes, setAllFlushes] = useState<Flush[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilePath, setSelectedFilePath] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [typingState, setTypingState] = useState<TypingState>({ code: "", cursorPos: -1, editStart: 0, editEnd: 0, phase: "idle" });
  const [playheadMs, setPlayheadMs] = useState(0);
  const [currentFlushIdx, setCurrentFlushIdx] = useState(0);
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
        <div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Progress Replay</span>
          <span style={{ color: "var(--text-muted)", fontSize: 12, marginLeft: 12 }}>Student: {studentId}</span>
        </div>
        <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
          {currentTime || "—"}
        </span>
      </div>

      {/* Main content: file tree + code viewer */}
      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", flex: 1, minHeight: 0, overflow: "hidden" }}>
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
      </div>

      {/* Bottom: controls + density bar */}
      <div style={{ borderTop: "1px solid var(--border)", background: "var(--surface)", padding: "0.4rem 0.75rem 0.3rem", flexShrink: 0 }}>
        {/* Timeline scrubber */}
        <ReplayTimeline flushes={currentFlushes} stepIndex={currentFlushIdx} onSeek={seekToFlush} />

        {/* Controls row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.35rem" }}>
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

          {/* Elapsed / total time */}
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums", fontFamily: "ui-monospace, monospace" }}>
            {formatDuration(playheadMs)} / {formatDuration(totalDurationMs)}
            {currentTime && <span style={{ marginLeft: 8, fontFamily: "system-ui, sans-serif" }}>{currentTime}</span>}
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

        {/* Density bar at the very bottom */}
        <div style={{ marginTop: "0.3rem" }}>
          <DensityBar flushes={currentFlushes} stepIndex={currentFlushIdx} onSeek={seekToFlush} />
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
