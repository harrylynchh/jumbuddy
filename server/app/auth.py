import functools
import os
import jwt
from flask import request, g, jsonify
from .services.supabase_client import get_supabase

INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY", "vscode-dev-key")

def require_auth(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        # Allow internal VS Code extension requests
        if request.headers.get("X-Internal-Key") == INTERNAL_API_KEY:
            utln = request.headers.get("X-User-UTLN")
            if not utln:
                return jsonify({"error": "Missing X-User-UTLN header"}), 401
            
            sb = get_supabase()
            result = sb.table("profiles").select("id, email").eq("utln", utln).single().execute()
            if not result.data:
                return jsonify({"error": f"No user found for utln: {utln}"}), 404
            
            g.user_id = result.data["id"]
            g.user_email = result.data.get("email")
            return f(*args, **kwargs)

        # existing JWT auth
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401

        token = auth_header.split(" ", 1)[1]

        try:
            payload = jwt.decode(token, options={"verify_signature": False})
            g.user_id = payload.get("sub")
            g.user_email = payload.get("email")
        except jwt.PyJWTError:
            return jsonify({"error": "Invalid token"}), 401

        return f(*args, **kwargs)
    return decorated