from flask import Blueprint, jsonify, g
from ..auth import require_auth
from ..services.supabase_client import get_supabase

profiles_bp = Blueprint("profiles", __name__)


@profiles_bp.route("/me", methods=["GET"])
@require_auth
def get_my_profile():
    """Get the current user's profile."""
    sb = get_supabase()
    result = sb.table("profiles").select("*").eq("id", g.user_id).single().execute()
    return jsonify({"data": result.data})
