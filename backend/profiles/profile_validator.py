
from datetime import date


def validate_farmer_profile(profile: dict) -> dict:
    """
    Validate farmer profile data quality.

    This function does not determine scheme eligibility.
    It only identifies missing, invalid and inconsistent data.
    """

    errors = []
    warnings = []
    missing = []

    if not profile:
        return {
            "valid": False,
            "errors": ["Farmer profile is empty or unavailable."],
            "warnings": [],
            "missing": [],
            "summary": {
                "error_count": 1,
                "warning_count": 0,
                "missing_count": 0
            }
        }

    farmer = profile.get("farmer") or {}
    landholdings = profile.get("landholdings") or []
    unassigned_crops = profile.get("unassigned_crops") or []

    # --------------------------------
    # 1. Farmer information
    # --------------------------------

    required_farmer_fields = [
        "full_name",
        "date_of_birth",
        "gender",
        "state",
        "district",
        "social_category",
        "annual_family_income",
        "farmer_category"
    ]

    for field in required_farmer_fields:
        if farmer.get(field) is None or farmer.get(field) == "":
            missing.append(f"Farmer information missing: {field}")

    # Date of birth validation
    dob = farmer.get("date_of_birth")

    if dob:
        try:
            parsed_dob = (
                date.fromisoformat(dob)
                if isinstance(dob, str)
                else dob
            )

            if parsed_dob > date.today():
                errors.append("Date of birth is in the future.")

        except (ValueError, TypeError):
            errors.append("Invalid date of birth format.")

    # Income validation
    income = farmer.get("annual_family_income")

    if income is not None:
        if not isinstance(income, (int, float)) or income < 0:
            errors.append("Annual family income must be a non-negative number.")

    # Profile verification
    verification_status = farmer.get(
        "profile_verification_status"
    )

    if verification_status != "VERIFIED":
        warnings.append(
            "Farmer profile is not verified. "
            f"Current status: {verification_status or 'UNKNOWN'}."
        )

    # --------------------------------
    # 2. Landholding validation
    # --------------------------------

    if not landholdings:
        missing.append("No landholding records available.")

    total_land_area = 0.0
    comparable_area = True

    for index, plot in enumerate(landholdings, start=1):

        plot_name = f"Landholding {index}"

        area = plot.get("land_area")
        unit = plot.get("land_area_unit")

        if area is None:
            missing.append(f"{plot_name}: land area missing.")

        elif not isinstance(area, (int, float)) or area <= 0:
            errors.append(f"{plot_name}: land area must be positive.")

        else:
            if unit == "HECTARE":
                total_land_area += area
            else:
                comparable_area = False
                warnings.append(
                    f"{plot_name}: unsupported or unknown land area "
                    f"unit '{unit}'."
                )

        for field in ["ownership_type", "state", "district", "village"]:
            if not plot.get(field):
                missing.append(f"{plot_name}: {field} missing.")

        # Check whether plot location differs from farmer location.
        for field in ["state", "district"]:
            farmer_value = farmer.get(field)
            plot_value = plot.get(field)

            if (
                farmer_value
                and plot_value
                and farmer_value.strip().casefold()
                != plot_value.strip().casefold()
            ):
                warnings.append(
                    f"{plot_name}: {field} differs from farmer's "
                    "registered location."
                )

        # --------------------------------
        # 3. Crop validation
        # --------------------------------

        crops = plot.get("crops") or []

        for crop in crops:
            if not crop.get("crop_name"):
                missing.append(
                    f"{plot_name}: crop name missing."
                )

            year = crop.get("cultivation_year")

            if year is None:
                missing.append(
                    f"{plot_name}: crop cultivation year missing."
                )
            elif (
                not isinstance(year, int)
                or year < 1900
                or year > date.today().year
            ):
                errors.append(
                    f"{plot_name}: invalid crop cultivation year."
                )

        # --------------------------------
        # 4. Tree validation
        # --------------------------------

        for tree in plot.get("trees") or []:

            if not tree.get("tree_name"):
                missing.append(
                    f"{plot_name}: tree name missing."
                )

            count = tree.get("tree_count")

            if count is None:
                missing.append(
                    f"{plot_name}: tree count missing."
                )
            elif not isinstance(count, int) or count <= 0:
                errors.append(
                    f"{plot_name}: tree count must be positive."
                )

            age = tree.get("tree_age_years")

            if age is not None and age < 0:
                errors.append(
                    f"{plot_name}: tree age cannot be negative."
                )

        # --------------------------------
        # 5. Livestock validation
        # --------------------------------

        for animal in plot.get("livestock") or []:

            if not animal.get("animal_type"):
                missing.append(
                    f"{plot_name}: livestock type missing."
                )

            count = animal.get("animal_count")

            if count is None:
                missing.append(
                    f"{plot_name}: livestock count missing."
                )
            elif not isinstance(count, int) or count <= 0:
                errors.append(
                    f"{plot_name}: livestock count must be positive."
                )

            age = animal.get("age_years")

            if age is not None and age < 0:
                errors.append(
                    f"{plot_name}: livestock age cannot be negative."
                )

    # --------------------------------
    # 6. Cross-record checks
    # --------------------------------

    if unassigned_crops:
        warnings.append(
            f"{len(unassigned_crops)} crop records have no "
            "landholding association."
        )

    if (
        comparable_area
        and total_land_area > 0
        and farmer.get("farmer_category")
    ):
        warnings.append(
            "Total recorded land area is "
            f"{total_land_area:.2f} hectares. "
            "Farmer category is "
            f"{farmer['farmer_category']}. "
            "Review their consistency; this is not an eligibility decision."
        )

    # --------------------------------
    # 7. Final validation result
    # --------------------------------

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "missing": missing,
        "summary": {
            "error_count": len(errors),
            "warning_count": len(warnings),
            "missing_count": len(missing)
        }
    }
