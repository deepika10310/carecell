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