import os
import psycopg2
import psycopg2.extras


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def query(sql, params=None, fetch="all"):
    conn = get_conn()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(sql, params or ())
        if fetch == "all":
            result = cur.fetchall()
        elif fetch == "one":
            result = cur.fetchone()
        else:
            result = None
        conn.commit()
        return result
    finally:
        conn.close()


def execute(sql, params=None):
    conn = get_conn()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(sql, params or ())
        try:
            result = cur.fetchone()
        except Exception:
            result = None
        conn.commit()
        return result
    finally:
        conn.close()
