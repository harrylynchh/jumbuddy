from flask import Blueprint, jsonify, request
from ..auth import require_auth
from ..services.supabase_client import get_supabase
from ..services.analysis import (
    flushes_to_edit_regions,
    compute_linger_scores,
    compute_current_focus,
    compute_class_struggle,
)
from ..services.llm import generate_detailed_report, generate_class_narrative
from dataclasses import asdict
import os

analysis_bp = Blueprint("analysis", __name__)


@analysis_bp.route("/secret", methods=["GET"])
def debug_secret():
    """Debug endpoint to check if OPENAI_API_KEY is loaded."""
    key = os.environ.get("OPENAI_API_KEY", "NOT_SET")
    return jsonify({
        "openai_key_present": bool(key and key != "NOT_SET"),
        "openai_key_length": len(key) if key else 0,
        "openai_key_prefix": key[:20] if key and len(key) > 20 else key,
        "all_env_keys": sorted([k for k in os.environ.keys() if "API" in k or "KEY" in k]),
    })


@analysis_bp.route("/report/<student_id>", methods=["GET"])
@require_auth
def generate_report(student_id):
    """Generate detailed AI report analyzing student workflow from diffs."""
    sb = get_supabase()
    assignment_id = request.args.get("assignment_id")
    if not assignment_id:
        return jsonify({"error": "assignment_id required"}), 400

    result = (
        sb.table("flushes")
        .select("*")
        .eq("profile_id", student_id)
        .eq("assignment_id", assignment_id)
        .order("start_timestamp", desc=False)
        .execute()
    )
    flushes = result.data or []

    if not flushes:
        return jsonify({"data": {"report": "No activity recorded for this student."}})

    # Compute metrics
    regions = flushes_to_edit_regions(flushes)
    linger_scores = compute_linger_scores(regions)

    # Generate intelligent report
    report = generate_detailed_report(flushes, linger_scores)

    return jsonify({"data": {"report": report}})


@analysis_bp.route("/student/<student_id>", methods=["GET"])
@require_auth
def student_analysis(student_id):
    """Per-student analysis: linger scores, current focus, total time."""
    sb = get_supabase()
    assignment_id = request.args.get("assignment_id")
    if not assignment_id:
        return jsonify({"error": "assignment_id required"}), 400

    result = (
        sb.table("flushes")
        .select("*")
        .eq("profile_id", student_id)
        .eq("assignment_id", assignment_id)
        .order("start_timestamp", desc=False)
        .execute()
    )
    flushes = result.data or []

    regions = flushes_to_edit_regions(flushes)
    linger = compute_linger_scores(regions)
    focus = compute_current_focus(regions)
    total_time = sum(r.duration_sec for r in regions)

    # File breakdown
    file_times: dict[str, float] = {}
    for r in regions:
        file_times[r.file_path] = file_times.get(r.file_path, 0) + r.duration_sec
    file_breakdown = [
        {"file_path": fp, "time_sec": round(t, 1)}
        for fp, t in sorted(file_times.items(), key=lambda x: -x[1])
    ]

    return jsonify({
        "data": {
            "linger": [asdict(s) for s in linger],
            "focus": [asdict(f) for f in focus],
            "total_time_sec": round(total_time, 1),
            "file_breakdown": file_breakdown,
        }
    })


@analysis_bp.route("/class/<assignment_id>", methods=["GET"])
@require_auth
def class_analysis(assignment_id):
    """Class-wide analysis: struggle topics across all students."""
    sb = get_supabase()

    result = (
        sb.table("flushes")
        .select("*")
        .eq("assignment_id", assignment_id)
        .order("start_timestamp", desc=False)
        .execute()
    )
    all_flushes = result.data or []

    # Group by student
    student_flushes: dict[str, list[dict]] = {}
    for f in all_flushes:
        student_flushes.setdefault(f["profile_id"], []).append(f)

    # Compute per-student linger scores
    all_student_scores = []
    student_lingers: dict[str, list] = {}
    for sid, flushes in student_flushes.items():
        regions = flushes_to_edit_regions(flushes)
        scores = compute_linger_scores(regions)
        all_student_scores.append(scores)
        student_lingers[sid] = [asdict(s) for s in scores]

    # Class-wide struggle
    struggle = compute_class_struggle(all_student_scores)

    return jsonify({
        "data": {
            "struggle_topics": [asdict(s) for s in struggle],
            "student_count": len(student_flushes),
            "total_flushes": len(all_flushes),
            "student_lingers": student_lingers,
        }
    })
