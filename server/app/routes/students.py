from flask import Blueprint, jsonify
from ..auth import require_auth
from ..services.supabase_client import get_supabase

students_bp = Blueprint("students", __name__)


@students_bp.route("/assignment/<assignment_id>", methods=["GET"])
@require_auth
def get_students_for_assignment(assignment_id):
    """Return all students enrolled in the course for a given assignment."""
    sb = get_supabase()

    # Get the course_id for this assignment
    assignment = (
        sb.table("assignments")
        .select("course_id")
        .eq("id", assignment_id)
        .single()
        .execute()
    )
    if not assignment.data:
        return jsonify({"error": "Assignment not found"}), 404

    course_id = assignment.data["course_id"]

    # Get all students in that course, joining profiles for utln/email/display_name
    result = (
        sb.table("students")
        .select("id, enrolled_at, profiles(id, utln, email, display_name)")
        .eq("course_id", course_id)
        .execute()
    )

    students = []
    for row in result.data or []:
        profile = row.get("profiles", {})
        students.append({
            "student_id": row["id"],
            "enrolled_at": row.get("enrolled_at"),
            "profile_id": profile.get("id"),
            "utln": profile.get("utln"),
            "email": profile.get("email"),
            "display_name": profile.get("display_name"),
        })

    return jsonify({"data": students})
