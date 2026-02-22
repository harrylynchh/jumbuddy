import os
import yaml
from dotenv import load_dotenv

load_dotenv()


def load_config():
    """Load config.yaml and merge with environment variables."""
    config = {}

    # Load config.yaml (check both project root and working dir)
    for path in ["config.yaml", "../config.yaml"]:
        if os.path.exists(path):
            with open(path) as f:
                config = yaml.safe_load(f) or {}
            break

    config["SUPABASE_URL"] = os.environ.get("SUPABASE_URL", "")
    config["SUPABASE_ANON_KEY"] = os.environ.get("SUPABASE_ANON_KEY", "")
    config["SUPABASE_SERVICE_ROLE_KEY"] = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    config["SECRET_KEY"] = os.environ.get("FLASK_SECRET_KEY", "dev-secret")
    config["OPENAI_API_KEY"] = os.environ.get("OPENAI_API_KEY", "")

    return config
