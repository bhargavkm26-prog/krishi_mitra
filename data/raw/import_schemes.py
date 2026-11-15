"""
Load the MyScheme dataset (CSV or JSON) into the Postgres / Supabase `schemes` table.

Usage:
    pip install psycopg2-binary
    export DATABASE_URL="postgresql://postgres.<ref>:<password>@<host>:5432/postgres"
    python import_schemes.py gov_myscheme_data.csv
    python import_schemes.py gov_myscheme_data__1_.json      # same data, either works

Safe to re-run: rows are upserted on scheme_slug, so nothing gets duplicated.
"""
import csv
import json
import os
import sys

import psycopg2
from psycopg2.extras import execute_values

BATCH_SIZE = 200

# source column -> table column
COLUMN_MAP = {
    "Scheme Name": "scheme_name",
    "Scheme Slug": "scheme_slug",
    "Level": "level",
    "State / UT / Ministry": "state_ut_ministry",
    "Application Mode": "application_mode",
    "Tags / Categories": "tags",
    "Description": "description",
    "Eligibility Criteria": "eligibility_criteria",
    "Eligibility (General)": "eligibility_general",
    "Exclusions / Ineligibility": "exclusions_ineligibility",
    "Benefits": "benefits",
    "Application Process": "application_process",
    "Documents Required": "documents_required",
    "Frequently Asked Questions (FAQs)": "faqs",
    "Official Link": "official_link",
    "MyScheme URL": "myscheme_url",
}
DB_COLUMNS = list(COLUMN_MAP.values())



def load_rows(path):
    if path.lower().endswith(".json"):
        with open(path, encoding="utf-8") as f:
            return json.load(f)

    # Windows-compatible CSV field size limit
    max_int = 2**31 - 1
    csv.field_size_limit(max_int)

    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def clean(value):
    """Empty / missing cells become NULL; strip stray NUL bytes Postgres rejects."""
    if value is None:
        return None
    if not isinstance(value, str):
        value = str(value)
    value = value.replace("\x00", "").strip()
    return value or None


def split_tags(value):
    """'A, B, C' -> ['A', 'B', 'C'] (trimmed, de-duplicated, order kept)."""
    if not value:
        return []
    seen, out = set(), []
    for tag in value.split(","):
        tag = tag.strip()
        if tag and tag.lower() not in seen:
            seen.add(tag.lower())
            out.append(tag)
    return out


def to_record(raw):
    rec = {}
    for src, dst in COLUMN_MAP.items():
        rec[dst] = clean(raw.get(src))
    rec["tags"] = split_tags(rec["tags"])
    return tuple(rec[c] for c in DB_COLUMNS)


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        sys.exit("Set DATABASE_URL first (Supabase -> Project Settings -> Database -> Connection string).")

    rows = load_rows(sys.argv[1])
    records = [to_record(r) for r in rows]
    print(f"Read {len(records)} schemes from {sys.argv[1]}")

    update_cols = [c for c in DB_COLUMNS if c != "scheme_slug"]
    sql = (
        f"INSERT INTO public.schemes ({', '.join(DB_COLUMNS)}) VALUES %s "
        f"ON CONFLICT (scheme_slug) DO UPDATE SET "
        + ", ".join(f"{c} = EXCLUDED.{c}" for c in update_cols)
    )

    conn = psycopg2.connect(dsn)
    try:
        with conn, conn.cursor() as cur:  # one transaction: all or nothing
            for i in range(0, len(records), BATCH_SIZE):
                execute_values(cur, sql, records[i:i + BATCH_SIZE], page_size=BATCH_SIZE)
                print(f"  upserted {min(i + BATCH_SIZE, len(records))}/{len(records)}")
            cur.execute("SELECT COUNT(*) FROM public.schemes")
            print(f"Done. schemes table now has {cur.fetchone()[0]} rows.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
