"""
Algorithmic analysis of student edit patterns.
Pure functions — no DB access. All insights are explainable and computed.
"""

import math
import re
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class HunkStat:
    line_start: int
    line_end: int
    inserted: int
    deleted: int


@dataclass
class EditRegion:
    file_path: str
    symbol: str | None
    line_start: int
    line_end: int
    chars_inserted: int
    chars_deleted: int
    net_change: int
    start_time: str
    end_time: str
    duration_sec: float


@dataclass
class SymbolScore:
    file_path: str
    symbol: str
    linger_score: float
    dwell_time: float
    churn: float
    visits: int


@dataclass
class FocusArea:
    file_path: str
    symbol: str
    weighted_time: float


@dataclass
class ClassSymbolScore:
    symbol: str
    struggle_index: float
    student_count: int
    avg_dwell_time: float
    avg_churn: float


def parse_diff_stats(diff_text: str) -> list[HunkStat]:
    """Parse diff text, return list of per-hunk stats.

    Supports two formats:
    1. Unified diff with @@ headers
    2. Simple +/- line diffs (no headers) as produced by seed generators
    """
    hunks: list[HunkStat] = []
    if not diff_text:
        return hunks

    lines = diff_text.split("\n")
    hunk_pattern = re.compile(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@")

    has_hunk_headers = any(hunk_pattern.match(l) for l in lines)

    if has_hunk_headers:
        # Unified diff format
        hunk_starts: list[int] = []
        for i, line in enumerate(lines):
            if hunk_pattern.match(line):
                hunk_starts.append(i)

        for hi, start_line_idx in enumerate(hunk_starts):
            m = hunk_pattern.match(lines[start_line_idx])
            if not m:
                continue
            new_start = int(m.group(1))
            end_idx = hunk_starts[hi + 1] if hi + 1 < len(hunk_starts) else len(lines)

            inserted = 0
            deleted = 0
            max_line = new_start
            for li in range(start_line_idx + 1, end_idx):
                line = lines[li]
                if line.startswith("+"):
                    inserted += len(line) - 1
                    max_line += 1
                elif line.startswith("-"):
                    deleted += len(line) - 1
                elif line.startswith(" "):
                    max_line += 1

            hunks.append(HunkStat(
                line_start=new_start,
                line_end=max_line,
                inserted=inserted,
                deleted=deleted,
            ))
    else:
        # Simple +/- format: treat entire diff as one hunk
        inserted = 0
        deleted = 0
        line_num = 1
        max_line = 1
        for line in lines:
            if line.startswith("+"):
                inserted += len(line) - 1
                max_line = max(max_line, line_num)
                line_num += 1
            elif line.startswith("-"):
                deleted += len(line) - 1
            else:
                line_num += 1

        if inserted > 0 or deleted > 0:
            hunks.append(HunkStat(
                line_start=1,
                line_end=max_line,
                inserted=inserted,
                deleted=deleted,
            ))

    return hunks


def flushes_to_edit_regions(flushes: list[dict]) -> list[EditRegion]:
    """
    Convert raw flush dicts to EditRegion list.

    IMPORTANT: Creates ONE region per flush (not per hunk) to prevent
    time overcounting. All hunks in a flush are aggregated together.
    """
    regions: list[EditRegion] = []
    for f in flushes:
        hunks = parse_diff_stats(f.get("diffs", ""))
        duration = f.get("window_duration") or 0.0
        symbol = f.get("active_symbol") or None

        # Aggregate all hunks from this flush
        if hunks:
            total_inserted = sum(h.inserted for h in hunks)
            total_deleted = sum(h.deleted for h in hunks)
            line_start = min(h.line_start for h in hunks)
            line_end = max(h.line_end for h in hunks)
        else:
            total_inserted = 0
            total_deleted = 0
            line_start = 0
            line_end = 0

        # Create ONE region per flush (aggregated stats)
        regions.append(EditRegion(
            file_path=f["file_path"],
            symbol=symbol,
            line_start=line_start,
            line_end=line_end,
            chars_inserted=total_inserted,
            chars_deleted=total_deleted,
            net_change=total_inserted - total_deleted,
            start_time=f["start_timestamp"],
            end_time=f["end_timestamp"],
            duration_sec=duration,
        ))

    return regions


def _normalize_symbol(s: str | None) -> str:
    """Normalize symbol name for fuzzy matching."""
    if not s:
        return "(unknown)"
    return s.strip().lower()


def compute_linger_scores(regions: list[EditRegion]) -> list[SymbolScore]:
    """Algorithm 1: Linger Detection. Returns ranked list by linger_score desc."""
    # Group by (file_path, normalized symbol)
    groups: dict[tuple[str, str], list[EditRegion]] = {}
    for r in regions:
        key = (r.file_path, _normalize_symbol(r.symbol))
        groups.setdefault(key, []).append(r)

    scores: list[SymbolScore] = []
    # Compute max dwell time for normalization
    all_dwells = {k: sum(r.duration_sec for r in rs) for k, rs in groups.items()}
    max_dwell = max(all_dwells.values(), default=1.0) or 1.0

    for (fp, sym), rs in groups.items():
        dwell_time = sum(r.duration_sec for r in rs)
        visits = len(rs)
        total_inserted = sum(r.chars_inserted for r in rs)
        total_deleted = sum(r.chars_deleted for r in rs)
        net_abs = abs(sum(r.net_change for r in rs))

        # Churn: high means lots of rewriting
        churn = (total_inserted + total_deleted) / max(net_abs, 1)

        # Normalized dwell
        dwell_norm = dwell_time / max_dwell

        # Linger score
        linger_score = dwell_norm * churn * visits

        scores.append(SymbolScore(
            file_path=fp,
            symbol=sym,
            linger_score=round(linger_score, 2),
            dwell_time=round(dwell_time, 1),
            churn=round(churn, 2),
            visits=visits,
        ))

    scores.sort(key=lambda s: s.linger_score, reverse=True)
    return scores


def compute_current_focus(
    regions: list[EditRegion],
    window_minutes: float = 30,
) -> list[FocusArea]:
    """Algorithm 2: Recency / Current Focus."""
    if not regions:
        return []

    # Find the latest timestamp
    def parse_ts(s: str) -> float:
        try:
            return datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp()
        except Exception:
            return 0.0

    latest = max(parse_ts(r.end_time) for r in regions)

    focus: dict[tuple[str, str], float] = {}
    for r in regions:
        age_sec = latest - parse_ts(r.end_time)
        age_min = age_sec / 60.0
        decay = math.exp(-age_min / window_minutes)
        key = (r.file_path, _normalize_symbol(r.symbol))
        focus[key] = focus.get(key, 0) + r.duration_sec * decay

    result = [
        FocusArea(file_path=fp, symbol=sym, weighted_time=round(wt, 2))
        for (fp, sym), wt in focus.items()
    ]
    result.sort(key=lambda f: f.weighted_time, reverse=True)
    return result


def compute_class_struggle(
    all_student_scores: list[list[SymbolScore]],
    threshold: float = 1.0,
) -> list[ClassSymbolScore]:
    """Algorithm 3: Class-wide Topic Struggle."""
    # Group across students by normalized symbol
    symbol_data: dict[str, list[SymbolScore]] = {}
    for student_scores in all_student_scores:
        # Deduplicate per student: take highest linger per symbol
        best_per_sym: dict[str, SymbolScore] = {}
        for s in student_scores:
            key = _normalize_symbol(s.symbol)
            if key not in best_per_sym or s.linger_score > best_per_sym[key].linger_score:
                best_per_sym[key] = s
        for sym, score in best_per_sym.items():
            if score.linger_score >= threshold:
                symbol_data.setdefault(sym, []).append(score)

    results: list[ClassSymbolScore] = []
    for sym, scores in symbol_data.items():
        student_count = len(scores)
        avg_linger = sum(s.linger_score for s in scores) / student_count
        avg_dwell = sum(s.dwell_time for s in scores) / student_count
        avg_churn = sum(s.churn for s in scores) / student_count
        struggle_index = student_count * avg_linger

        results.append(ClassSymbolScore(
            symbol=sym,
            struggle_index=round(struggle_index, 2),
            student_count=student_count,
            avg_dwell_time=round(avg_dwell, 1),
            avg_churn=round(avg_churn, 2),
        ))

    results.sort(key=lambda r: r.struggle_index, reverse=True)
    return results
