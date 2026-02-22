import secrets
from flask import Blueprint, jsonify, request, g
from ..auth import require_auth
from ..services.supabase_client import get_supabase

extensions_bp = Blueprint("extensions", __name__)


def _resolve_key(key):
    """Lookup assignment_key → returns (assignment_id, course_id) or None."""
    sb = get_supabase()
    result = (
        sb.table("assignment_keys")
        .select("assignment_id")
        .eq("key", key)
        .maybe_single()
        .execute()
    )
    if not result.data:
        return None
    assignment_id = result.data["assignment_id"]
    assignment = (
        sb.table("assignments")
        .select("course_id")
        .eq("id", assignment_id)
        .single()
        .execute()
    )
    return {
        "assignment_id": assignment_id,
        "course_id": assignment.data["course_id"],
    }


@extensions_bp.route("/connect-info", methods=["GET"])
@require_auth
def connect_info():
    """Get the logged-in user's courses and assignments for the /connect page."""
    sb = get_supabase()

    # Get user's profile (utln)
    profile = sb.table("profiles").select("utln").eq("id", g.user_id).single().execute()
    utln = profile.data["utln"]

    # Get all courses the user is part of (professor, student, or assistant)
    prof_courses = (
        sb.table("courses")
        .select("id, name, code")
        .eq("professor_id", g.user_id)
        .execute()
    )
    student_rows = (
        sb.table("students")
        .select("course_id")
        .eq("profile_id", g.user_id)
        .execute()
    )
    assistant_rows = (
        sb.table("assistants")
        .select("course_id")
        .eq("profile_id", g.user_id)
        .execute()
    )

    member_ids = list(set(
        [r["course_id"] for r in (student_rows.data or [])] +
        [r["course_id"] for r in (assistant_rows.data or [])]
    ))
    member_courses = []
    if member_ids:
        member_courses = (
            sb.table("courses")
            .select("id, name, code")
            .in_("id", member_ids)
            .execute()
        ).data or []

    # Deduplicate
    seen = set()
    courses = []
    for c in (prof_courses.data or []) + member_courses:
        if c["id"] not in seen:
            seen.add(c["id"])
            courses.append(c)

    # Get assignments for each course
    course_ids = [c["id"] for c in courses]
    assignments = []
    if course_ids:
        assignments = (
            sb.table("assignments")
            .select("id, name, description, due_date, course_id")
            .in_("course_id", course_ids)
            .execute()
        ).data or []

    return jsonify({
        "utln": utln,
        "courses": courses,
        "assignments": assignments,
    })


@extensions_bp.route("/generate-key", methods=["POST"])
@require_auth
def generate_key():
    """Auto-generate an assignment key. Requires JWT auth."""
    body = request.get_json()
    if not body:
        return jsonify({"error": "JSON body required"}), 400

    assignment_id = body.get("assignment_id")
    if not assignment_id:
        return jsonify({"error": "assignment_id required"}), 400

    sb = get_supabase()

    # Return existing key if one exists
    existing = (
        sb.table("assignment_keys")
        .select("key")
        .eq("assignment_id", assignment_id)
        .maybe_single()
        .execute()
    )
    if existing.data:
        return jsonify({"key": existing.data["key"]})

    # Generate new key
    key = f"ak_{secrets.token_hex(16)}"
    sb.table("assignment_keys").insert({
        "key": key,
        "assignment_id": assignment_id,
    }).execute()

    return jsonify({"key": key})


@extensions_bp.route("/validate-key", methods=["GET"])
def validate_key():
    """Validate an assignment key and return assignment + course info."""
    key = request.args.get("key")
    if not key:
        return jsonify({"error": "key parameter required"}), 400

    resolved = _resolve_key(key)
    if not resolved:
        return jsonify({"error": "Invalid assignment key"}), 401

    sb = get_supabase()
    assignment = (
        sb.table("assignments")
        .select("id, name, description, due_date, course_id")
        .eq("id", resolved["assignment_id"])
        .single()
        .execute()
    )
    course = (
        sb.table("courses")
        .select("id, name, code")
        .eq("id", resolved["course_id"])
        .single()
        .execute()
    )

    return jsonify({
        "assignment": assignment.data,
        "course": course.data,
    })


@extensions_bp.route("/flushes", methods=["POST"])
def create_flushes():
    """Batch insert flushes. Requires assignment key + utln."""
    body = request.get_json()
    if not body:
        return jsonify({"error": "JSON body required"}), 400

    key = body.get("key")
    utln = body.get("utln")
    flushes = body.get("flushes")

    if not key or not utln or not flushes:
        return jsonify({"error": "key, utln, and flushes are required"}), 400

    resolved = _resolve_key(key)
    if not resolved:
        return jsonify({"error": "Invalid assignment key"}), 401

    assignment_id = resolved["assignment_id"]

    sb = get_supabase()

    profile = sb.table("profiles").select("id").eq("utln", utln).maybe_single().execute()
    if not profile.data:
        return jsonify({"error": "Profile not found for utln"}), 404

    user_id = profile.data["id"]

    rows = []
    for f in flushes:
        rows.append({
            "user_id": user_id,
            "assignment_id": assignment_id,
            "file_path": f["file_path"],
            "trigger": f["trigger"],
            "start_timestamp": f["start_timestamp"],
            "end_timestamp": f["end_timestamp"],
            "diffs": f["diffs"],
            "active_symbol": f.get("active_symbol"),
            "metrics": {},
        })

    result = sb.table("flushes").insert(rows).execute()

    return jsonify({"inserted": len(result.data or [])})
