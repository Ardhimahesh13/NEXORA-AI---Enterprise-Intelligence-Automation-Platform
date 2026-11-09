import json
from contextlib import contextmanager # humein yeh resource management cleanly handle karne mein help karta hai.
import psycopg  # Python application ko PostgreSQL database ke saath communicate karne
from psycopg.rows import dict_row # data changes to dictionary usally in rows(Tuple)
from app.config import settings 

@contextmanager
def connection():
    # Render provides a PostgreSQL connection URL. Prefer its external URL
    # for a FastAPI process running on your computer.
    url = settings().database_url
    if not url:
        raise RuntimeError("DATABASE_URL is missing from .env")
    with psycopg.connect(url, row_factory=dict_row, connect_timeout=10) as conn:
        yield conn

def audit(conn, actor, tenant, action, detail):
    conn.execute('INSERT INTO audit_events (actor,tenant_id,action,detail) VALUES (%s,%s,%s,%s)',
                 (actor, tenant, action, json.dumps(detail)))