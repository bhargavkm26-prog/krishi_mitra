import sys
sys.path.insert(0, r"d:\krisi mitra")
from backend.database.connection import get_connection

TABLES = (
    "farmer_profiles",
    "farmer_landholdings",
    "farmer_crops",
    "farmer_trees",
    "farmer_livestock",
    "india_locations",
)

conn = get_connection()
try:
    with conn.cursor() as cur:
        for t in TABLES:
            print(f"\n=== TABLE: public.{t} ===")
            cur.execute("""
                SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = %s
                ORDER BY ordinal_position;
            """, (t,))
            for col in cur.fetchall():
                print(f"  {col[0]} | {col[1]}({col[4]}) | nullable={col[2]} | default={col[3]}")

            cur.execute("""
                SELECT conname, contype, pg_get_constraintdef(c.oid)
                FROM pg_constraint c
                JOIN pg_class tbl ON tbl.oid = c.conrelid
                JOIN pg_namespace nsp ON nsp.oid = tbl.relnamespace
                WHERE nsp.nspname = 'public' AND tbl.relname = %s
                ORDER BY contype, conname;
            """, (t,))
            print("  CONSTRAINTS:")
            for con in cur.fetchall():
                print(f"    [{con[1]}] {con[0]}: {con[2]}")
finally:
    conn.close()
