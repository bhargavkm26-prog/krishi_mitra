
from backend.database.connection import get_connection


def get_all_schemes(limit=None, offset=0):
    """
    Retrieve all scheme columns.
    Supports pagination for large datasets.
    """

    if offset < 0:
        raise ValueError("Offset cannot be negative")

    if limit is not None and limit <= 0:
        raise ValueError("Limit must be positive")

    query = """
        SELECT *
        FROM public.schemes
        ORDER BY id
    """

    params = []

    if limit is not None:
        query += " LIMIT %s"
        params.append(limit)

    query += " OFFSET %s"
    params.append(offset)

    conn = get_connection()

    try:
        with conn.cursor() as cur:
            cur.execute(query, tuple(params))

            columns = [desc[0] for desc in cur.description]
            rows = cur.fetchall()

            return [
                dict(zip(columns, row))
                for row in rows
            ]

    finally:
        conn.close()


def get_scheme_by_id(scheme_id):
    """Retrieve one scheme using its database ID."""

    query = """
        SELECT *
        FROM public.schemes
        WHERE id = %s
    """

    conn = get_connection()

    try:
        with conn.cursor() as cur:
            cur.execute(query, (scheme_id,))

            row = cur.fetchone()

            if row is None:
                return None

            columns = [desc[0] for desc in cur.description]

            return dict(zip(columns, row))

    finally:
        conn.close()


def get_schemes_by_state_or_ministry(search_term):
    """Search schemes by state, UT or ministry."""

    query = """
        SELECT *
        FROM public.schemes
        WHERE state_ut_ministry ILIKE %s
        ORDER BY id
    """

    conn = get_connection()

    try:
        with conn.cursor() as cur:
            cur.execute(query, (f"%{search_term}%",))

            columns = [desc[0] for desc in cur.description]

            return [
                dict(zip(columns, row))
                for row in cur.fetchall()
            ]

    finally:
        conn.close()


def get_schemes_by_tags(tags):
    """
    Retrieve schemes matching any supplied tag.
    Matching is case-insensitive and exact.
    """

    if not tags:
        return []

    normalized_tags = [tag.strip().lower() for tag in tags if tag.strip()]

    if not normalized_tags:
        return []

    query = """
        SELECT DISTINCT s.*
        FROM public.schemes s
        WHERE EXISTS (
            SELECT 1
            FROM unnest(s.tags) AS t(tag)
            WHERE LOWER(TRIM(t.tag)) = ANY(%s)
        )
        ORDER BY s.id
    """

    conn = get_connection()

    try:
        with conn.cursor() as cur:
            cur.execute(query, (normalized_tags,))

            columns = [desc[0] for desc in cur.description]

            return [
                dict(zip(columns, row))
                for row in cur.fetchall()
            ]

    finally:
        conn.close()
