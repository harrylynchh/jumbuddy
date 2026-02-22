import logging
import secrets
from flask import Blueprint, jsonify, request, g
from ..auth import require_auth
from ..services.supabase_client import get_supabase

log = logging.getLogger("extensions")
log.setLevel(logging.DEBUG)

extensions_bp = Blueprint("extensions", __name__)


def _resolve_key(key):
    """Lookup assignment_key → returns {user_id, assignment_id, course_id} or None."""
    sb = get_supabase()
    result = (
        sb.table("assignment_keys")
        .select("user_id, assignment_id")
        .eq("key", key)
        .execute()
    )
    if not result.data:
        log.warning("Key lookup failed: key not found")
        return None

    user_id = result.data[0]["user_id"]
    assignment_id = result.data[0]["assignment_id"]

    assignment = (
        sb.table("assignments")
        .select("course_id")
        .eq("id", assignment_id)
        .single()
        .execute()
    )

    log.debug("Key resolved: user_id=%s assignment_id=%s", user_id, assignment_id)
    return {
        "user_id": user_id,
        "assignment_id": assignment_id,
        "course_id": assignment.data["course_id"],
    }


@extensions_bp.route("/connect-info", methods=["GET"])
@require_auth
def connect_info():
    """Get the logged-in user's courses and assignments for the /connect page."""
    log.info("connect-info requested by user_id=%s", g.user_id)
    sb = get_supabase()

    profile = sb.table("profiles").select("utln").eq("id", g.user_id).single().execute()
    utln = profile.data["utln"]

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

    seen = set()
    courses = []
    for c in (prof_courses.data or []) + member_courses:
        if c["id"] not in seen:
            seen.add(c["id"])
            courses.append(c)

    course_ids = [c["id"] for c in courses]
    assignments = []
    if course_ids:
        assignments = (
            sb.table("assignments")
            .select("id, name, description, due_date, course_id")
            .in_("course_id", course_ids)
            .execute()
        ).data or []

    log.info("connect-info: utln=%s courses=%d assignments=%d", utln, len(courses), len(assignments))
    return jsonify({
        "utln": utln,
        "courses": courses,
        "assignments": assignments,
    })


@extensions_bp.route("/generate-key", methods=["POST"])
@require_auth
def generate_key():
    """Generate a unique API key for this user + assignment. Requires JWT auth."""
    body = request.get_json()
    if not body:
        return jsonify({"error": "JSON body required"}), 400

    assignment_id = body.get("assignment_id")
    if not assignment_id:
        return jsonify({"error": "assignment_id required"}), 400

    user_id = g.user_id
    log.info("generate-key: user_id=%s assignment_id=%s", user_id, assignment_id)

    sb = get_supabase()

    # Return existing key if user already has one for this assignment
    existing = (
        sb.table("assignment_keys")
        .select("key")
        .eq("user_id", user_id)
        .eq("assignment_id", assignment_id)
        .execute()
    )
    if existing.data:
        log.info("generate-key: returning existing key for user_id=%s", user_id)
        return jsonify({"key": existing.data[0]["key"]})

    # Generate new unique key
    key = f"ak_{secrets.token_hex(16)}"
    sb.table("assignment_keys").insert({
        "key": key,
        "user_id": user_id,
        "assignment_id": assignment_id,
    }).execute()

    log.info("generate-key: created new key for user_id=%s key=%s...", user_id, key[:12])
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
    """Batch insert flushes. Key identifies both user and assignment."""
    body = request.get_json()
    if not body:
        return jsonify({"error": "JSON body required"}), 400

    key = body.get("key")
    flushes = body.get("flushes")

    if not key or not flushes:
        return jsonify({"error": "key and flushes are required"}), 400

    resolved = _resolve_key(key)
    if not resolved:
        return jsonify({"error": "Invalid assignment key"}), 401

    user_id = resolved["user_id"]
    assignment_id = resolved["assignment_id"]

    log.info("flushes: user_id=%s assignment_id=%s count=%d", user_id, assignment_id, len(flushes))

    sb = get_supabase()

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
    inserted = len(result.data or [])

    log.info("flushes: inserted %d rows for user_id=%s", inserted, user_id)
    return jsonify({"inserted": inserted})
