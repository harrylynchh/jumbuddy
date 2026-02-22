import functools
import jwt
from flask import request, g, jsonify


def require_auth(f):
    """Middleware decorator that extracts the Supabase user from the JWT."""
    @functools.wraps(f)
    def decorated(*args, **kwargs):
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
