from flask import Blueprint, jsonify
from ..auth import require_auth
from ..services.supabase_client import get_supabase

assignments_bp = Blueprint("assignments", __name__)


@assignments_bp.route("/course/<course_id>", methods=["GET"])
@require_auth
def get_assignments_for_course(course_id):
    """Return all assignments for a given course with their metadata."""
    sb = get_supabase()
    result = (
        sb.table("assignments")
        .select("*")
        .eq("course_id", course_id)
        .order("created_at")
        .execute()
    )
    return jsonify({"data": result.data})
