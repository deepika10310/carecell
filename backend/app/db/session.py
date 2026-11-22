from sqlalchemy import URL, create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import DATABASE_URL, MYSQL_DATABASE, MYSQL_HOST, MYSQL_PASSWORD, MYSQL_PORT, MYSQL_USER


if DATABASE_URL:
    database_url = make_url(DATABASE_URL)
    if database_url.drivername == "mysql":
        database_url = database_url.set(drivername="mysql+pymysql")
    if database_url.drivername == "mysql+pymysql" and "charset" not in database_url.query:
        database_url = database_url.update_query_dict({"charset": "utf8mb4"})
else:
    database_url = URL.create(
        drivername="mysql+pymysql",
        username=MYSQL_USER,
        password=MYSQL_PASSWORD,
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        database=MYSQL_DATABASE,
        query={"charset": "utf8mb4"},
    )

engine = create_engine(database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()