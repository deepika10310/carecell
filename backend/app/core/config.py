import os


def get_bool_setting(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


MYSQL_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "carecell")
MYSQL_USER = os.getenv("MYSQL_USER", "carecell_app")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "")
COOKIE_SECURE = get_bool_setting("COOKIE_SECURE")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_S3_BUCKET = os.getenv("AWS_S3_BUCKET")
AWS_S3_ENDPOINT_URL = os.getenv("AWS_S3_ENDPOINT_URL") or None
AWS_ACCESS_KEY_ID= os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY= os.getenv("AWS_SECRET_ACCESS_KEY")
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1").rstrip("/")
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")
LLM_TIMEOUT_SECONDS = float(os.getenv("LLM_TIMEOUT_SECONDS", "60"))