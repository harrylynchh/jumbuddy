from flask import Blueprint, jsonify, g, request
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


@profiles_bp.route("/resolve-utln", methods=["POST"])
def resolve_utln():
    """Look up email by UTLN (unauthenticated — used on login page)."""
    body = request.get_json(force=True)
    utln = body.get("utln", "").strip().lower()
    if not utln:
        return jsonify({"error": "utln required"}), 400

    sb = get_supabase()
    result = sb.table("profiles").select("email").eq("utln", utln).execute()
    if not result.data:
        return jsonify({"error": "UTLN not found"}), 404
    return jsonify({"email": result.data[0]["email"]})
