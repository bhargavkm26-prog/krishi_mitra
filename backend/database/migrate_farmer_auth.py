"""
PostgreSQL migration:
1. Adds plain-text `password` column to `public.farmer_profiles`.
2. Populates `password = farmer_unique_id` for existing rows where `password IS NULL`.
3. Creates `public.farmer_profiles_view` placing `password` right next to `farmer_unique_id` for easy pgAdmin viewing.
"""

from backend.database.connection import get_connection


def run_migration() -> dict:
    conn = get_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                # 1. Add plain-text password column safely
                cur.execute("""
                    ALTER TABLE public.farmer_profiles
                    ADD COLUMN IF NOT EXISTS password VARCHAR(255);
                """)

                # 2. Set password = farmer_unique_id for existing rows where password IS NULL
                cur.execute("""
                    UPDATE public.farmer_profiles
                    SET password = farmer_unique_id
                    WHERE password IS NULL;
                """)
                updated_count = cur.rowcount

                # 3. Create convenience view with password next to farmer_unique_id
                cur.execute("""
                    CREATE OR REPLACE VIEW public.farmer_profiles_view AS
                    SELECT
                        farmer_id,
                        farmer_unique_id,
                        password,
                        full_name,
                        date_of_birth,
                        gender,
                        mobile_number,
                        state,
                        district,
                        sub_district,
                        village,
                        pincode,
                        social_category,
                        farmer_category,
                        annual_family_income,
                        kcc_holder,
                        farmer_registration_id,
                        profile_verification_status,
                        location_id,
                        created_at,
                        updated_at
                    FROM public.farmer_profiles;
                """)

                # 4. Verify counts and sample rows
                cur.execute("SELECT COUNT(*), COUNT(password) FROM public.farmer_profiles;")
                total_farmers, with_password = cur.fetchone()

                cur.execute("""
                    SELECT farmer_id, farmer_unique_id, password, full_name
                    FROM public.farmer_profiles_view
                    ORDER BY farmer_id
                    LIMIT 5;
                """)
                first_rows = cur.fetchall()

                cur.execute("""
                    SELECT farmer_id, farmer_unique_id, password, full_name
                    FROM public.farmer_profiles_view
                    ORDER BY farmer_id DESC
                    LIMIT 2;
                """)
                last_rows = cur.fetchall()

        return {
            "total_farmers": total_farmers,
            "with_password": with_password,
            "updated_this_run": updated_count,
            "first_rows": first_rows,
            "last_rows": last_rows,
        }
    finally:
        conn.close()


if __name__ == "__main__":
    result = run_migration()
    print("Total farmers:", result["total_farmers"])
    print("Non-null passwords:", result["with_password"])
    print("Updated this run:", result["updated_this_run"])
    print("First 5 view rows:")
    for r in result["first_rows"]:
        print(" ", r)
    print("Last 2 view rows:")
    for r in result["last_rows"]:
        print(" ", r)
