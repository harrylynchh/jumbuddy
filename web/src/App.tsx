import { useState, useEffect, useCallback } from "react";
import { supabase } from "./api/supabase";
import type { Session } from "@supabase/supabase-js";

const API = "http://localhost:10000";

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("professor@jumbud.test");
  const [password, setPassword] = useState("testpass123");
  const [error, setError] = useState("");

  // Foo state
  const [foos, setFoos] = useState<any[]>([]);
  const [newBar, setNewBar] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBar, setEditBar] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) =>
      setSession(s),
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  const authHeaders = useCallback(() => {
    if (!session) return {};
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    };
  }, [session]);

  // Fetch foos from server API
  const loadFoos = useCallback(async () => {
    if (!session) return;
    const res = await fetch(`${API}/api/foo`, { headers: authHeaders() });
    const json = await res.json();
    setFoos(json.data || []);
  }, [session, authHeaders]);

  useEffect(() => {
    loadFoos();
  }, [loadFoos]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setError(error.message);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setFoos([]);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newBar.trim()) return;
    await fetch(`${API}/api/foo`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ bar: newBar }),
    });
    setNewBar("");
    loadFoos();
  }

  async function handleUpdate(id: string) {
    await fetch(`${API}/api/foo/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ bar: editBar }),
    });
    setEditingId(null);
    setEditBar("");
    loadFoos();
  }

  async function handleDelete(id: string) {
    await fetch(`${API}/api/foo/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    loadFoos();
  }

  if (!session) {
    return (
      <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif", maxWidth: 400 }}>
        <h1>JumBud</h1>
        <p>Sign in to continue</p>
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

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif", maxWidth: 600 }}>
      <h1>JumBud</h1>
      <p>
        Signed in as: <strong>{session.user.email}</strong>{" "}
        <button onClick={handleLogout} style={{ marginLeft: "0.5rem" }}>
          Sign Out
        </button>
      </p>

      <hr style={{ margin: "1rem 0" }} />

      <h2>Foo Table (test CRUD via server API)</h2>

      {/* Create */}
      <form onSubmit={handleCreate} style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Enter bar value..."
          value={newBar}
          onChange={(e) => setNewBar(e.target.value)}
          style={{ padding: "0.5rem", marginRight: "0.5rem", width: "60%" }}
        />
        <button type="submit" style={{ padding: "0.5rem 1rem" }}>
          Add Foo
        </button>
      </form>

      {/* List */}
      {foos.length === 0 && <p style={{ color: "#888" }}>No foo records yet. Create one above.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {foos.map((foo) => (
          <li
            key={foo.id}
            style={{
              padding: "0.5rem",
              marginBottom: "0.5rem",
              border: "1px solid #ccc",
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            {editingId === foo.id ? (
              <>
                <input
                  type="text"
                  value={editBar}
                  onChange={(e) => setEditBar(e.target.value)}
                  style={{ padding: "0.25rem", flex: 1 }}
                  autoFocus
                />
                <button onClick={() => handleUpdate(foo.id)}>Save</button>
                <button onClick={() => setEditingId(null)}>Cancel</button>
              </>
            ) : (
              <>
                <span style={{ flex: 1 }}>
                  <strong>bar:</strong> {foo.bar}
                </span>
                <button
                  onClick={() => {
                    setEditingId(foo.id);
                    setEditBar(foo.bar);
                  }}
                >
                  Edit
                </button>
                <button onClick={() => handleDelete(foo.id)} style={{ color: "red" }}>
                  Delete
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
