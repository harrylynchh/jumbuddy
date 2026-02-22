from flask import Blueprint, jsonify

static_bp = Blueprint("static", __name__)


@static_bp.route("/")
def index():
    return jsonify({"status": "ok", "service": "JumBud API"})


@static_bp.route("/health")
def health():
    return jsonify({"healthy": True})
