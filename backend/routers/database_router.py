from typing import Optional
from fastapi import APIRouter, HTTPException, Query
import psycopg2
from backend.database.connection import get_connection
from backend.reasoning.tools import SecretariatToolkit
from backend.profiles.profile_aggregator import get_farmer_profile
from backend.schemas.database_schemas import (
    CheckUniqueIdResponse,
    FarmerLoginRequest,
    NewFarmerRegisterRequest,
    NewFarmerRegisterResponse,
    FarmerProfileUpdateRequest,
    FarmerProfileUpdateResponse,
    SchemeSummary,
    SchemeListResponse,
    SchemeDossierResponse,
    FarmerProfileCreate,
    FarmerProfileResponse,
    FarmerFactsResponse,
    RawVectorQueryRequest,
    RawVectorQueryResponse,
    RawVectorMatch,
    DatabaseHealthResponse,
    validate_unique_id_rules,
)

router = APIRouter(prefix="/api/v1/database", tags=["API 1: PostgreSQL + pgvector Service"])


@router.get("/health", response_model=DatabaseHealthResponse)
def database_health():
    """Verify PostgreSQL socket, pgvector extension, and row counts."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT extversion FROM pg_extension WHERE extname = 'vector';")
            ext = cur.fetchone()
            pgvector_ver = ext[0] if ext else None

            cur.execute("SELECT count(*) FROM public.schemes;")
            schemes_cnt = cur.fetchone()[0]

            cur.execute("SELECT count(*) FROM public.scheme_chunks WHERE section_type = 'FAQ';")
            faq_cnt = cur.fetchone()[0]

            return DatabaseHealthResponse(
                status="healthy",
                schemes_count=schemes_cnt,
                faq_chunks_count=faq_cnt,
                pgvector_version=pgvector_ver
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")
    finally:
        conn.close()


# =====================================================================
# LGD LOCATION DIRECTORY (`public.india_locations`)
# =====================================================================

@router.get("/locations/states")
def list_location_states():
    """List distinct States available in `india_locations`."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT DISTINCT state_name, state_code
                FROM public.india_locations
                ORDER BY state_name;
            """)
            return {
                "states": [
                    {"state_name": r[0], "state_code": r[1]}
                    for r in cur.fetchall()
                ]
            }
    finally:
        conn.close()


@router.get("/locations/districts")
def list_location_districts(state: str = Query(..., min_length=1)):
    """List distinct Districts for a given State from `india_locations`."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT DISTINCT district_name, district_code
                FROM public.india_locations
                WHERE LOWER(state_name) = LOWER(%s)
                ORDER BY district_name;
            """, (state.strip(),))
            return {
                "districts": [
                    {"district_name": r[0], "district_code": r[1]}
                    for r in cur.fetchall()
                ]
            }
    finally:
        conn.close()


@router.get("/locations/sub-districts")
def list_location_sub_districts(
    state: str = Query(..., min_length=1),
    district: str = Query(..., min_length=1),
):
    """List distinct Sub-Districts / Taluks for a State + District."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT DISTINCT sub_district_name, sub_district_code
                FROM public.india_locations
                WHERE LOWER(state_name) = LOWER(%s)
                  AND LOWER(district_name) = LOWER(%s)
                ORDER BY sub_district_name;
            """, (state.strip(), district.strip()))
            return {
                "sub_districts": [
                    {"sub_district_name": r[0], "sub_district_code": r[1]}
                    for r in cur.fetchall()
                ]
            }
    finally:
        conn.close()


@router.get("/locations/villages")
def list_location_villages(
    state: str = Query(..., min_length=1),
    district: str = Query(..., min_length=1),
    sub_district: str = Query(..., min_length=1),
):
    """List Villages and official LGD `location_id` for a State + District + Sub-District."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT location_id, village_name, village_code, state_code, district_code, sub_district_code
                FROM public.india_locations
                WHERE LOWER(state_name) = LOWER(%s)
                  AND LOWER(district_name) = LOWER(%s)
                  AND LOWER(sub_district_name) = LOWER(%s)
                ORDER BY village_name;
            """, (state.strip(), district.strip(), sub_district.strip()))
            return {
                "villages": [
                    {
                        "location_id": r[0],
                        "village_name": r[1],
                        "village_code": r[2],
                        "state_code": r[3],
                        "district_code": r[4],
                        "sub_district_code": r[5],
                    }
                    for r in cur.fetchall()
                ]
            }
    finally:
        conn.close()


# =====================================================================
# SCHEMES CATALOG
# =====================================================================

@router.get("/schemes", response_model=SchemeListResponse)
def list_schemes(
    search: Optional[str] = Query(None, description="Search query for scheme name or keyword"),
    state: Optional[str] = Query(None, description="Filter by state/UT"),
    ministry: Optional[str] = Query(None, description="Filter by ministry"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """Retrieve paginated government schemes with optional search and geographic/ministry filters."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            base_query = "FROM public.schemes WHERE 1=1"
            params = []

            if search:
                base_query += " AND (scheme_name ILIKE %s OR scheme_slug ILIKE %s OR tags::text ILIKE %s)"
                term = f"%{search}%"
                params.extend([term, term, term])

            if state:
                base_query += " AND (state_ut_ministry ILIKE %s OR level = 'Central Government')"
                params.append(f"%{state}%")

            if ministry:
                base_query += " AND state_ut_ministry ILIKE %s"
                params.append(f"%{ministry}%")

            count_sql = f"SELECT count(*) {base_query};"
            cur.execute(count_sql, tuple(params))
            total_count = cur.fetchone()[0]

            select_sql = f"""
                SELECT id, scheme_name, scheme_slug, level, state_ut_ministry, application_mode, tags
                {base_query}
                ORDER BY id
                LIMIT %s OFFSET %s;
            """
            params.extend([limit, offset])
            cur.execute(select_sql, tuple(params))

            schemes = []
            for row in cur.fetchall():
                schemes.append(SchemeSummary(
                    id=row[0],
                    scheme_name=row[1],
                    scheme_slug=row[2],
                    level=row[3],
                    state_ut_ministry=row[4],
                    application_mode=row[5],
                    tags=row[6]
                ))

            return SchemeListResponse(
                total=total_count,
                limit=limit,
                offset=offset,
                schemes=schemes
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch schemes: {str(e)}")
    finally:
        conn.close()


@router.get("/schemes/{scheme_id}", response_model=SchemeDossierResponse)
def get_scheme_dossier(scheme_id: int):
    """Retrieve full 17-column official government scheme record."""
    result = SecretariatToolkit.get_scheme_dossier(scheme_id)
    if not result.get("found"):
        raise HTTPException(status_code=404, detail=f"Scheme with ID {scheme_id} not found.")
    return SchemeDossierResponse(found=True, dossier=result.get("dossier"))


# =====================================================================
# FARMER AUTHENTICATION, REGISTRATION & PROFILE FETCH
# =====================================================================

@router.get("/farmers/check-id/{farmer_unique_id}", response_model=CheckUniqueIdResponse)
def check_farmer_unique_id(farmer_unique_id: str):
    """
    Validate user-chosen `farmer_unique_id` against PostgreSQL format constraints
    and verify whether it is already taken in `public.farmer_profiles`.
    """
    candidate = farmer_unique_id.strip()
    valid_fmt, err_msg = validate_unique_id_rules(candidate)
    if not valid_fmt:
        return CheckUniqueIdResponse(
            farmer_unique_id=candidate,
            valid_format=False,
            available=False,
            message=err_msg or "Invalid User ID format."
        )

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT farmer_id
                FROM public.farmer_profiles
                WHERE LOWER(farmer_unique_id) = LOWER(%s)
                LIMIT 1;
                """,
                (candidate,)
            )
            exists = cur.fetchone() is not None

        if exists:
            return CheckUniqueIdResponse(
                farmer_unique_id=candidate,
                valid_format=True,
                available=False,
                message=f"User ID '{candidate}' is already taken. Please create another one."
            )

        return CheckUniqueIdResponse(
            farmer_unique_id=candidate,
            valid_format=True,
            available=True,
            message=f"User ID '{candidate}' is available."
        )
    finally:
        conn.close()


@router.post("/farmers/login", response_model=FarmerFactsResponse)
def login_farmer(req: FarmerLoginRequest):
    """
    Authenticate farmer using `farmer_unique_id` and `password`.
    Both must match a record in `public.farmer_profiles` before returning dashboard facts.
    """
    uid = req.farmer_unique_id.strip()
    pw = req.password

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT farmer_id, password
                FROM public.farmer_profiles
                WHERE LOWER(farmer_unique_id) = LOWER(%s)
                LIMIT 1;
                """,
                (uid,)
            )
            row = cur.fetchone()

        if not row or row[1] is None or row[1] != pw:
            raise HTTPException(
                status_code=401,
                detail="Invalid User ID or Password. Please verify both credentials and try again."
            )

        profile = get_farmer_profile(row[0])
        if not profile or not profile.get("farmer"):
            raise HTTPException(status_code=404, detail="Farmer profile record could not be loaded.")

        return FarmerFactsResponse(
            found=True,
            farmer=profile.get("farmer"),
            landholdings=profile.get("landholdings"),
            unassigned_crops=profile.get("unassigned_crops", []),
        )
    finally:
        conn.close()


def _resolve_location_from_db(cur, location_id: Optional[int], state: Optional[str], district: Optional[str], sub_district: Optional[str], village: Optional[str]):
    """Validate optional LGD `location_id` against `india_locations` and fill missing names if resolved."""
    if location_id is None:
        return None, state, district, sub_district, village

    cur.execute(
        """
        SELECT location_id, state_name, district_name, sub_district_name, village_name
        FROM public.india_locations
        WHERE location_id = %s;
        """,
        (location_id,)
    )
    loc = cur.fetchone()
    if not loc:
        raise HTTPException(
            status_code=422,
            detail=f"location_id {location_id} does not exist in india_locations."
        )
    return (
        loc[0],
        state or loc[1],
        district or loc[2],
        sub_district or loc[3],
        village or loc[4],
    )


def _sync_farmer_child_tables(cur, farmer_id: int, req, is_update: bool = False) -> tuple[int, int, int, int]:
    """
    Insert or synchronize `farmer_landholdings`, `farmer_crops`, `farmer_trees`, and `farmer_livestock`
    inside an active PostgreSQL transaction while enforcing composite FK constraints.
    """
    existing_plot_ids: set[int] = set()
    if is_update:
        # Remove dependent leaf assets first so deleted plots never fail or leave stale rows
        cur.execute("DELETE FROM public.farmer_trees WHERE farmer_id = %s;", (farmer_id,))
        cur.execute("DELETE FROM public.farmer_livestock WHERE farmer_id = %s;", (farmer_id,))
        cur.execute("DELETE FROM public.farmer_crops WHERE farmer_id = %s;", (farmer_id,))
        cur.execute("SELECT landholding_id FROM public.farmer_landholdings WHERE farmer_id = %s;", (farmer_id,))
        existing_plot_ids = {r[0] for r in cur.fetchall()}

    plot_id_map: dict[int, int] = {}
    surviving_plot_ids: list[int] = []
    landholdings_count = 0

    for idx, plot in enumerate(req.landholdings):
        has_any_plot_data = any(
            x is not None
            for x in (
                plot.land_area,
                plot.ownership_type,
                plot.irrigation_available,
                plot.state,
                plot.district,
                plot.village,
                plot.location_id,
            )
        )
        if not has_any_plot_data:
            continue

        p_loc_id, p_state, p_district, _, p_village = _resolve_location_from_db(
            cur, plot.location_id, plot.state, plot.district, None, plot.village
        )
        unit = plot.land_area_unit if plot.land_area is not None else (
            plot.land_area_unit if plot.ownership_type or p_loc_id else None
        )
        existing_lh_id = getattr(plot, "landholding_id", None)

        if is_update and existing_lh_id is not None and existing_lh_id in existing_plot_ids:
            cur.execute(
                """
                UPDATE public.farmer_landholdings
                SET land_area = %s,
                    land_area_unit = %s,
                    ownership_type = %s,
                    irrigation_available = %s,
                    state = %s,
                    district = %s,
                    village = %s,
                    location_id = %s
                WHERE farmer_id = %s AND landholding_id = %s;
                """,
                (
                    plot.land_area,
                    unit,
                    plot.ownership_type,
                    plot.irrigation_available,
                    p_state,
                    p_district,
                    p_village,
                    p_loc_id,
                    farmer_id,
                    existing_lh_id,
                ),
            )
            landholding_id = existing_lh_id
        else:
            cur.execute(
                """
                INSERT INTO public.farmer_landholdings (
                    farmer_id,
                    land_area,
                    land_area_unit,
                    ownership_type,
                    irrigation_available,
                    state,
                    district,
                    village,
                    location_id
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING landholding_id;
                """,
                (
                    farmer_id,
                    plot.land_area,
                    unit,
                    plot.ownership_type,
                    plot.irrigation_available,
                    p_state,
                    p_district,
                    p_village,
                    p_loc_id,
                ),
            )
            landholding_id = cur.fetchone()[0]

        plot_id_map[idx] = landholding_id
        surviving_plot_ids.append(landholding_id)
        landholdings_count += 1

    if is_update:
        if surviving_plot_ids:
            cur.execute(
                "DELETE FROM public.farmer_landholdings WHERE farmer_id = %s AND NOT (landholding_id = ANY(%s));",
                (farmer_id, surviving_plot_ids),
            )
        else:
            cur.execute("DELETE FROM public.farmer_landholdings WHERE farmer_id = %s;", (farmer_id,))

    # Crops (`landholding_id` optional -> nullable composite FK)
    crops_count = 0
    for crop in req.crops:
        has_any_crop_data = any(
            x is not None for x in (crop.crop_name, crop.crop_season, crop.cultivation_year)
        )
        if not has_any_crop_data:
            continue

        linked_land_id = plot_id_map.get(crop.plot_index) if crop.plot_index is not None else None
        if linked_land_id is None and crop.plot_index is not None:
            raise HTTPException(
                status_code=422,
                detail=f"Crop references non-existent or empty plot index {crop.plot_index}.",
            )

        cur.execute(
            """
            INSERT INTO public.farmer_crops (
                farmer_id,
                landholding_id,
                crop_name,
                crop_season,
                cultivation_year
            )
            VALUES (%s, %s, %s, %s, %s);
            """,
            (
                farmer_id,
                linked_land_id,
                crop.crop_name,
                crop.crop_season,
                crop.cultivation_year,
            ),
        )
        crops_count += 1

    # Trees (`landholding_id` NOT NULL, `tree_count > 0`)
    trees_count = 0
    for tree in req.trees:
        if tree.tree_name is None and tree.tree_count is None and tree.tree_variety is None and tree.tree_age_years is None and tree.purpose is None:
            continue
        if not tree.tree_name or tree.tree_count is None or tree.tree_count <= 0:
            raise HTTPException(
                status_code=422,
                detail="Each tree entry must include a tree name and a positive tree_count (> 0).",
            )
        if tree.tree_age_years is not None and tree.tree_age_years < 0:
            raise HTTPException(status_code=422, detail="tree_age_years cannot be negative.")

        target_idx = tree.plot_index if tree.plot_index is not None else 0
        linked_land_id = plot_id_map.get(target_idx)
        if linked_land_id is None:
            raise HTTPException(
                status_code=422,
                detail="farmer_trees requires at least one saved landholding plot (landholding_id NOT NULL).",
            )

        cur.execute(
            """
            INSERT INTO public.farmer_trees (
                farmer_id,
                landholding_id,
                tree_name,
                tree_variety,
                tree_count,
                tree_age_years,
                purpose
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s);
            """,
            (
                farmer_id,
                linked_land_id,
                tree.tree_name,
                tree.tree_variety,
                tree.tree_count,
                tree.tree_age_years,
                tree.purpose,
            ),
        )
        trees_count += 1

    # Livestock (`landholding_id` NOT NULL, `animal_count > 0`)
    livestock_count = 0
    for animal in req.livestock:
        if animal.animal_type is None and animal.animal_count is None and animal.breed is None and animal.age_years is None and animal.purpose is None:
            continue
        if not animal.animal_type or animal.animal_count is None or animal.animal_count <= 0:
            raise HTTPException(
                status_code=422,
                detail="Each livestock entry must include an animal_type and positive animal_count (> 0).",
            )
        if animal.age_years is not None and animal.age_years < 0:
            raise HTTPException(status_code=422, detail="Livestock age_years cannot be negative.")

        target_idx = animal.plot_index if animal.plot_index is not None else 0
        linked_land_id = plot_id_map.get(target_idx)
        if linked_land_id is None:
            raise HTTPException(
                status_code=422,
                detail="farmer_livestock requires at least one saved landholding plot (landholding_id NOT NULL).",
            )

        cur.execute(
            """
            INSERT INTO public.farmer_livestock (
                farmer_id,
                landholding_id,
                animal_type,
                breed,
                animal_count,
                age_years,
                purpose
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s);
            """,
            (
                farmer_id,
                linked_land_id,
                animal.animal_type,
                animal.breed,
                animal.animal_count,
                animal.age_years,
                animal.purpose,
            ),
        )
        livestock_count += 1

    return landholdings_count, crops_count, trees_count, livestock_count


@router.post("/farmers/register", response_model=NewFarmerRegisterResponse)
def register_new_farmer(req: NewFarmerRegisterRequest):
    """
    Register a new farmer atomically across all 5 farmer tables + LGD `india_locations`:
    1. `public.farmer_profiles` (plain-text `password`, custom `farmer_unique_id`)
    2. `public.farmer_landholdings` (`(farmer_id, landholding_id)` unique composite key)
    3. `public.farmer_crops` (linked to plot or unassigned `NULL`)
    4. `public.farmer_trees` (linked to `(farmer_id, landholding_id)` with `tree_count > 0`)
    5. `public.farmer_livestock` (linked to `(farmer_id, landholding_id)` with `animal_count > 0`)

    Empty optional fields are stored cleanly as SQL `NULL`.
    """
    uid = req.farmer_unique_id.strip()
    valid_fmt, err_msg = validate_unique_id_rules(uid)
    if not valid_fmt:
        raise HTTPException(status_code=422, detail=err_msg or "Invalid User ID format.")

    pw = req.password.strip()
    if not pw:
        raise HTTPException(status_code=422, detail="Password cannot be empty or whitespace.")

    conn = get_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                # 1. Check uniqueness (case-insensitive)
                cur.execute(
                    "SELECT 1 FROM public.farmer_profiles WHERE LOWER(farmer_unique_id) = LOWER(%s) LIMIT 1;",
                    (uid,)
                )
                if cur.fetchone():
                    raise HTTPException(
                        status_code=409,
                        detail=f"User ID '{uid}' already exists. Please choose another User ID."
                    )

                # 2. Resolve profile location_id if provided
                prof_loc_id, prof_state, prof_district, prof_sub_district, prof_village = _resolve_location_from_db(
                    cur, req.location_id, req.state, req.district, req.sub_district, req.village
                )

                verification_status = req.profile_verification_status or "UNVERIFIED"

                # 3. Insert into `public.farmer_profiles`
                cur.execute(
                    """
                    INSERT INTO public.farmer_profiles (
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
                        location_id
                    )
                    VALUES (
                        %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s,
                        %s, %s
                    )
                    RETURNING farmer_id;
                    """,
                    (
                        uid,
                        pw,
                        req.full_name,
                        req.date_of_birth,
                        req.gender,
                        req.mobile_number,
                        prof_state,
                        prof_district,
                        prof_sub_district,
                        prof_village,
                        req.pincode,
                        req.social_category,
                        req.farmer_category,
                        req.annual_family_income,
                        req.kcc_holder,
                        req.farmer_registration_id,
                        verification_status,
                        prof_loc_id,
                    )
                )
                farmer_id = cur.fetchone()[0]

                # 4-7. Insert child records via shared transactional helper
                landholdings_created, crops_created, trees_created, livestock_created = _sync_farmer_child_tables(
                    cur, farmer_id, req, is_update=False
                )

        return NewFarmerRegisterResponse(
            success=True,
            farmer_id=farmer_id,
            farmer_unique_id=uid,
            landholdings_created=landholdings_created,
            crops_created=crops_created,
            trees_created=trees_created,
            livestock_created=livestock_created,
            message=f"Farmer '{uid}' registered successfully. Please log in with your User ID and Password."
        )
    except HTTPException:
        raise
    except psycopg2.Error as db_err:
        raise HTTPException(status_code=400, detail=f"Database constraint error: {db_err.pgerror or str(db_err)}")
    finally:
        conn.close()


def _resolve_target_farmer_id(identifier: str) -> Optional[tuple[int, str]]:
    """Resolve `farmer_id` and `farmer_unique_id` from numeric ID or `farmer_unique_id`."""
    ident = identifier.strip()
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            if ident.isdigit():
                cur.execute(
                    "SELECT farmer_id, farmer_unique_id FROM public.farmer_profiles WHERE farmer_id = %s LIMIT 1;",
                    (int(ident),),
                )
            else:
                cur.execute(
                    "SELECT farmer_id, farmer_unique_id FROM public.farmer_profiles WHERE LOWER(farmer_unique_id) = LOWER(%s) LIMIT 1;",
                    (ident,),
                )
            row = cur.fetchone()
            return (row[0], row[1]) if row else None
    finally:
        conn.close()


@router.put("/farmers/{identifier}", response_model=FarmerProfileUpdateResponse)
def update_farmer_profile(identifier: str, req: FarmerProfileUpdateRequest):
    """
    Atomically update all editable columns across:
    `farmer_profiles`, `farmer_landholdings`, `farmer_crops`, `farmer_trees`, `farmer_livestock`,
    plus LGD `india_locations.location_id` resolution. Empty optional fields save as SQL NULL.
    """
    resolved = _resolve_target_farmer_id(identifier)
    if not resolved:
        raise HTTPException(status_code=404, detail=f"Farmer '{identifier}' not found.")
    farmer_id, farmer_unique_id = resolved

    conn = get_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                prof_loc_id, prof_state, prof_district, prof_sub_district, prof_village = _resolve_location_from_db(
                    cur, req.location_id, req.state, req.district, req.sub_district, req.village
                )
                verification_status = req.profile_verification_status or "UNVERIFIED"

                # Update `public.farmer_profiles` (only overwrite password when explicitly entered)
                if req.password is not None and req.password.strip() != "":
                    cur.execute(
                        """
                        UPDATE public.farmer_profiles
                        SET password = %s,
                            full_name = %s,
                            date_of_birth = %s,
                            gender = %s,
                            mobile_number = %s,
                            state = %s,
                            district = %s,
                            sub_district = %s,
                            village = %s,
                            pincode = %s,
                            social_category = %s,
                            farmer_category = %s,
                            annual_family_income = %s,
                            kcc_holder = %s,
                            farmer_registration_id = %s,
                            profile_verification_status = %s,
                            location_id = %s,
                            updated_at = NOW()
                        WHERE farmer_id = %s;
                        """,
                        (
                            req.password.strip(),
                            req.full_name,
                            req.date_of_birth,
                            req.gender,
                            req.mobile_number,
                            prof_state,
                            prof_district,
                            prof_sub_district,
                            prof_village,
                            req.pincode,
                            req.social_category,
                            req.farmer_category,
                            req.annual_family_income,
                            req.kcc_holder,
                            req.farmer_registration_id,
                            verification_status,
                            prof_loc_id,
                            farmer_id,
                        ),
                    )
                else:
                    cur.execute(
                        """
                        UPDATE public.farmer_profiles
                        SET full_name = %s,
                            date_of_birth = %s,
                            gender = %s,
                            mobile_number = %s,
                            state = %s,
                            district = %s,
                            sub_district = %s,
                            village = %s,
                            pincode = %s,
                            social_category = %s,
                            farmer_category = %s,
                            annual_family_income = %s,
                            kcc_holder = %s,
                            farmer_registration_id = %s,
                            profile_verification_status = %s,
                            location_id = %s,
                            updated_at = NOW()
                        WHERE farmer_id = %s;
                        """,
                        (
                            req.full_name,
                            req.date_of_birth,
                            req.gender,
                            req.mobile_number,
                            prof_state,
                            prof_district,
                            prof_sub_district,
                            prof_village,
                            req.pincode,
                            req.social_category,
                            req.farmer_category,
                            req.annual_family_income,
                            req.kcc_holder,
                            req.farmer_registration_id,
                            verification_status,
                            prof_loc_id,
                            farmer_id,
                        ),
                    )

                landholdings_count, crops_count, trees_count, livestock_count = _sync_farmer_child_tables(
                    cur, farmer_id, req, is_update=True
                )

        profile = get_farmer_profile(farmer_id)
        if not profile or not profile.get("farmer"):
            raise HTTPException(status_code=404, detail="Updated farmer profile could not be reloaded.")

        return FarmerProfileUpdateResponse(
            found=True,
            success=True,
            farmer_id=farmer_id,
            farmer_unique_id=farmer_unique_id,
            landholdings_count=landholdings_count,
            crops_count=crops_count,
            trees_count=trees_count,
            livestock_count=livestock_count,
            farmer=profile.get("farmer"),
            landholdings=profile.get("landholdings", []),
            unassigned_crops=profile.get("unassigned_crops", []),
            message=(
                f"Updated '{farmer_unique_id}' in PostgreSQL "
                f"(Plots: {landholdings_count}, Crops: {crops_count}, Trees: {trees_count}, Livestock: {livestock_count})."
            ),
        )
    except HTTPException:
        raise
    except psycopg2.Error as db_err:
        raise HTTPException(status_code=400, detail=f"Database constraint error: {db_err.pgerror or str(db_err)}")
    finally:
        conn.close()


@router.get("/farmers/{identifier}", response_model=FarmerFactsResponse)
def get_farmer_details(identifier: str):
    """Retrieve registered farmer facts by numeric `farmer_id` OR `farmer_unique_id`."""
    ident = identifier.strip()
    target_id: Optional[int] = None

    if ident.isdigit():
        target_id = int(ident)
    else:
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT farmer_id FROM public.farmer_profiles WHERE LOWER(farmer_unique_id) = LOWER(%s) LIMIT 1;",
                    (ident,)
                )
                row = cur.fetchone()
                if row:
                    target_id = row[0]
        finally:
            conn.close()

    if target_id is None:
        raise HTTPException(status_code=404, detail=f"Farmer '{identifier}' not found.")

    profile = get_farmer_profile(target_id)
    if not profile or not profile.get("farmer"):
        raise HTTPException(status_code=404, detail=f"Farmer '{identifier}' not found.")

    return FarmerFactsResponse(
        found=True,
        farmer=profile.get("farmer"),
        landholdings=profile.get("landholdings"),
        unassigned_crops=profile.get("unassigned_crops", []),
    )


@router.post("/farmers/profile", response_model=FarmerProfileResponse)
def create_or_update_farmer(profile_data: FarmerProfileCreate):
    """Legacy profile wizard endpoint kept for backward compatibility."""
    synthetic_id = 101
    return FarmerProfileResponse(
        success=True,
        farmer_id=synthetic_id,
        message="Legacy profile wizard stub — use /api/v1/database/farmers/register for PostgreSQL persistence.",
        data=profile_data.model_dump()
    )


@router.post("/raw-vector-query", response_model=RawVectorQueryResponse)
def raw_vector_query(req: RawVectorQueryRequest):
    """Direct HNSW cosine/L2 distance search on chunk_dense_embeddings table."""
    if len(req.vector) != 1024:
        raise HTTPException(
            status_code=422,
            detail=f"Vector must be exactly 1024 dimensions, received {len(req.vector)}."
        )

    vector_str = "[" + ",".join(format(float(v), ".8g") for v in req.vector) + "]"
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SET hnsw.ef_search = 100;")
            cur.execute("""
                SELECT e.chunk_id, s.id, s.scheme_name, (e.embedding <=> %s::halfvec) as dist
                FROM public.chunk_dense_embeddings e
                JOIN public.scheme_chunks c ON c.chunk_id = e.chunk_id
                JOIN public.schemes s ON s.id = c.scheme_id
                ORDER BY e.embedding <=> %s::halfvec
                LIMIT %s;
            """, (vector_str, vector_str, req.limit))

            matches = []
            for r in cur.fetchall():
                matches.append(RawVectorMatch(
                    chunk_id=r[0],
                    scheme_id=r[1],
                    scheme_name=r[2],
                    distance=round(float(r[3]), 4)
                ))

            return RawVectorQueryResponse(count=len(matches), matches=matches)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vector query failed: {str(e)}")
    finally:
        conn.close()
