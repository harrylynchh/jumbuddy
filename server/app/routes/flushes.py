from flask import Blueprint, jsonify, request
from ..auth import require_auth
from ..services.supabase_client import get_supabase

flushes_bp = Blueprint("flushes", __name__)


@flushes_bp.route("/student/<student_id>", methods=["GET"])
@require_auth
def get_flushes_for_student(student_id):
    """Return all flushes for a given student, ordered oldest to newest."""
    sb = get_supabase()
    query = sb.table("flushes").select("*").eq("profile_id", student_id)

    assignment_id = request.args.get("assignment_id")
    if assignment_id:
        query = query.eq("assignment_id", assignment_id)

    result = query.order("start_timestamp", desc=False).execute()
    return jsonify({"data": result.data})
