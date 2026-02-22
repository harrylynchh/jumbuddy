"""
LLM presentation layer — translates computed metrics into readable narratives.
Preprocesses diffs into semantic timeline for intelligent analysis.
"""

import os
import re
from datetime import datetime
from .analysis import SymbolScore, FocusArea, ClassSymbolScore

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None  # type: ignore


def _get_client():
    if OpenAI is None:
        return None
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        return None
    return OpenAI(api_key=key)


def _call_llm(prompt: str, system: str, max_tokens: int = 200) -> str:
    client = _get_client()
    if not client:
        return "(LLM unavailable — set OPENAI_API_KEY to enable reports)"
    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            max_tokens=max_tokens,
            temperature=0.3,
        )
        return resp.choices[0].message.content or ""
    except Exception as e:
        return f"(LLM error: {e})"


def _preprocess_flushes_for_llm(flushes: list[dict]) -> str:
    """
    Convert flush sequence into readable timeline showing what student actually did.
    Groups by session (gaps > 30 min), shows file paths, symbols, and semantic diff summary.
    """
    if not flushes:
        return "No activity recorded."

    # Sort by timestamp
    flushes_sorted = sorted(flushes, key=lambda f: f["start_timestamp"])

    # Group into sessions (gaps > 30 min = new session)
    sessions = []
    current_session = []

    for i, flush in enumerate(flushes_sorted):
        if i == 0:
            current_session.append(flush)
        else:
            prev_end = datetime.fromisoformat(flushes_sorted[i-1]["end_timestamp"].replace("Z", "+00:00"))
            curr_start = datetime.fromisoformat(flush["start_timestamp"].replace("Z", "+00:00"))
            gap_minutes = (curr_start - prev_end).total_seconds() / 60

            if gap_minutes > 30:
                sessions.append(current_session)
                current_session = [flush]
            else:
                current_session.append(flush)

    if current_session:
        sessions.append(current_session)

    # Build timeline narrative
    timeline = []

    for sess_idx, session in enumerate(sessions):
        start_time = session[0]["start_timestamp"]
        end_time = session[-1]["end_timestamp"]
        duration_sec = sum(f.get("window_duration", 0) for f in session)

        timeline.append(f"\n=== Session {sess_idx + 1} ===")
        timeline.append(f"Time: {start_time[:16]} to {end_time[11:16]} ({int(duration_sec/60)}m {int(duration_sec%60)}s)")
        timeline.append(f"Files worked on: {len(set(f['file_path'] for f in session))}")

        # Group by file and symbol
        file_symbol_groups = {}
        for flush in session:
            key = (flush["file_path"], flush.get("active_symbol") or "(unknown)")
            if key not in file_symbol_groups:
                file_symbol_groups[key] = []
            file_symbol_groups[key].append(flush)

        # Summarize each file/symbol
        for (file_path, symbol), flushes in file_symbol_groups.items():
            timeline.append(f"\n  {file_path} → {symbol}:")

            visits = len(flushes)
            total_time = sum(f.get("window_duration", 0) for f in flushes)

            # Analyze diffs
            total_added = 0
            total_removed = 0
            diff_snippets = []

            for flush in flushes:
                diff = flush.get("diffs", "")
                if diff:
                    # Count added/removed lines
                    for line in diff.split("\n"):
                        if line.startswith("+") and not line.startswith("+++"):
                            total_added += 1
                            # Capture interesting additions (non-whitespace)
                            if len(line.strip()) > 3 and len(diff_snippets) < 3:
                                diff_snippets.append(("added", line[1:60]))
                        elif line.startswith("-") and not line.startswith("---"):
                            total_removed += 1
                            if len(line.strip()) > 3 and len(diff_snippets) < 3:
                                diff_snippets.append(("removed", line[1:60]))

            timeline.append(f"    Time: {int(total_time)}s, Visits: {visits}")
            timeline.append(f"    Changes: +{total_added} lines, -{total_removed} lines")

            if total_added > 0 and total_removed > 0:
                churn_ratio = (total_added + total_removed) / max(abs(total_added - total_removed), 1)
                if churn_ratio > 3:
                    timeline.append(f"    ⚠ High churn (rewrote multiple times)")

            if visits > 3:
                timeline.append(f"    ⚠ Revisited {visits} times (possible struggle)")

            # Show sample changes
            if diff_snippets:
                timeline.append(f"    Sample changes:")
                for action, snippet in diff_snippets[:2]:
                    timeline.append(f"      {action}: {snippet}")

    return "\n".join(timeline)


def generate_detailed_report(flushes: list[dict], linger_scores: list[SymbolScore]) -> str:
    """
    Generate intelligent report analyzing student workflow and struggles.
    Uses semantic diff content, not just metrics.
    """
    timeline = _preprocess_flushes_for_llm(flushes)

    # Get top struggles
    top_struggles = linger_scores[:5]
    struggle_summary = "\n".join(
        f"- {s.symbol} in {s.file_path}: {s.visits} visits, {int(s.dwell_time)}s, churn {s.churn}"
        for s in top_struggles
    ) if top_struggles else "No significant struggles detected."

    total_time = sum(f.get("window_duration", 0) for f in flushes)

    prompt = f"""You are a TA reviewing a student's coding assignment progress. Analyze their work session timeline and identify:

1. What did they actually work on? (be specific about files/functions)
2. Where did they struggle? (high churn, many revisits, time spent)
3. Were they productive or spinning their wheels?
4. What should the instructor/TA focus on to help them?

STUDENT WORK TIMELINE:
{timeline}

ALGORITHMIC STRUGGLE DETECTION:
{struggle_summary}

Total time: {int(total_time/60)} minutes

Provide a clear, actionable report for the TA in 4-6 sentences. Be specific about what the student did and where they need help."""

    system = "You are an experienced teaching assistant analyzing student code development patterns. Focus on semantic understanding of their workflow and struggles."

    return _call_llm(prompt, system, max_tokens=500)


def generate_class_narrative(struggle_topics: list[ClassSymbolScore]) -> str:
    top = struggle_topics[:8]

    prompt = f"""Class-wide struggle analysis:

Top struggling symbols/functions:
{chr(10).join(f"- {s.symbol}: struggle_index={s.struggle_index}, {s.student_count} students, avg_dwell={s.avg_dwell_time}s, avg_churn={s.avg_churn}" for s in top) or "No significant struggles detected."}

Summarize which topics/functions the class is struggling with most and suggest where the instructor should focus."""

    system = "You are a teaching assistant analytics tool. Summarize class-wide patterns in 2-3 concise sentences."
    return _call_llm(prompt, system, max_tokens=200)
