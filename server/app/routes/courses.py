from flask import Blueprint, jsonify, g
from ..auth import require_auth
from ..services.supabase_client import get_supabase

courses_bp = Blueprint("courses", __name__)


@courses_bp.route("/my", methods=["GET"])
@require_auth
def get_my_courses():
    """Return all courses the current user is in, with their role in each."""
    sb = get_supabase()

    # Check if they're a student in any courses
    student_rows = (
        sb.table("students")
        .select("course_id, enrolled_at, courses(id, name, code)")
        .eq("profile_id", g.user_id)
        .execute()
    )

    # Check if they're an assistant in any courses
    assistant_rows = (
        sb.table("assistants")
        .select("course_id, assigned_at, courses(id, name, code)")
        .eq("profile_id", g.user_id)
        .execute()
    )

    # Check if they're a professor in any courses
    professor_rows = (
        sb.table("courses")
        .select("id, name, code, created_at")
        .eq("professor_id", g.user_id)
        .execute()
    )

    results = []

    for row in student_rows.data or []:
        results.append({
            "role": "student",
            "enrolled_at": row.get("enrolled_at"),
            "course": row.get("courses"),
        })

    for row in assistant_rows.data or []:
        results.append({
            "role": "assistant",
            "assigned_at": row.get("assigned_at"),
            "course": row.get("courses"),
        })

    for row in professor_rows.data or []:
        results.append({
            "role": "professor",
            "course": row,
        })

    return jsonify({"data": results})
