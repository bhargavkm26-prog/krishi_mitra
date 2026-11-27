import sys
sys.path.insert(0, r"d:\krisi mitra")
from backend.database.connection import get_connection

conn = get_connection()
try:
    with conn.cursor() as cur:
        cur.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        print("PUBLIC TABLES:", [r[0] for r in cur.fetchall()])

        cur.execute("""
            SELECT
                tbl.relname AS child_table,
                conname,
                pg_get_constraintdef(c.oid)
            FROM pg_constraint c
            JOIN pg_class tbl ON tbl.oid = c.conrelid
            JOIN pg_namespace nsp ON nsp.oid = tbl.relnamespace
            WHERE nsp.nspname = 'public' AND contype = 'f'
            ORDER BY tbl.relname, conname;
        """)
        print("ALL PUBLIC FKS:")
        for r in cur.fetchall():
            print(" ", r)
finally:
    conn.close()
