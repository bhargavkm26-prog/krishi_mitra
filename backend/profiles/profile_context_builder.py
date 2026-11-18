
def build_farmer_context(profile: dict) -> dict:
    """
    Convert a structured farmer profile into retrieval context.

    Does not determine eligibility or exclude any farmer.
    Preserves missing and unverified information.
    """

    if not profile or not profile.get("farmer"):
        raise ValueError("A valid farmer profile is required.")

    farmer = profile["farmer"]
    landholdings = profile.get("landholdings") or []

    # --------------------------------
    # 1. Farmer-level context
    # --------------------------------

    farmer_context = {
        "state": farmer.get("state"),
        "district": farmer.get("district"),
        "social_category": farmer.get("social_category"),
        "farmer_category": farmer.get("farmer_category"),
        "annual_family_income": farmer.get("annual_family_income"),
        "date_of_birth": farmer.get("date_of_birth"),
        "gender": farmer.get("gender"),
        "kcc_holder": farmer.get("kcc_holder"),
        
    }

    # --------------------------------
    # 2. Plot-level context
    # --------------------------------

    plot_contexts = []

    for plot in landholdings:

        plot_contexts.append({
            "landholding_id": plot.get("landholding_id"),
            "land_area": plot.get("land_area"),
            "land_area_unit": plot.get("land_area_unit"),
            "ownership_type": plot.get("ownership_type"),
            "irrigation_available": plot.get(
                "irrigation_available"
            ),
            "state": plot.get("state"),
            "district": plot.get("district"),
            "village": plot.get("village"),

            "crops": [
                {
                    "name": crop.get("crop_name"),
                    "season": crop.get("crop_season"),
                    "year": crop.get("cultivation_year")
                }
                for crop in plot.get("crops", [])
            ],

            "trees": [
                {
                    "name": tree.get("tree_name"),
                    "variety": tree.get("tree_variety"),
                    "count": tree.get("tree_count"),
                    "purpose": tree.get("purpose")
                }
                for tree in plot.get("trees", [])
            ],

            "livestock": [
                {
                    "type": animal.get("animal_type"),
                    "breed": animal.get("breed"),
                    "count": animal.get("animal_count"),
                    "purpose": animal.get("purpose")
                }
                for animal in plot.get("livestock", [])
            ]
        })

    # --------------------------------
    # 3. Missing and uncertain context
    # --------------------------------

    missing_fields = []

    for field, value in farmer_context.items():
        if value is None or value == "":
            missing_fields.append(field)

    unassigned_crops = profile.get("unassigned_crops") or []

    # --------------------------------
    # 4. Build semantic retrieval text
    # --------------------------------

    lines = [
    "Farmer profile for government scheme discovery.",
    "Use the following farmer information to retrieve relevant schemes.",
    "",
    "FARMER INFORMATION:"
    ]

    for field, value in farmer_context.items():
        lines.append(f"{field}: {value if value is not None else 'Unknown'}")

    lines.append("")
    lines.append("LANDHOLDINGS AND AGRICULTURAL ASSETS:")

    for index, plot in enumerate(plot_contexts, start=1):

        lines.extend([
            "",
            f"Landholding {index}:",
            f"Land area: {plot['land_area']} {plot['land_area_unit'] or 'Unknown unit'}",
            f"Ownership: {plot['ownership_type'] or 'Unknown'}",
            f"Irrigation available: {plot['irrigation_available']}",
            f"Location: {plot['village']}, {plot['district']}, {plot['state']}"
        ])

        if plot["crops"]:
            crop_details = [
                f"{c['name']} ({c['season'] or 'Unknown season'}, "
                f"{c['year'] if c['year'] is not None else 'Unknown year'})"
                for c in plot["crops"]
            ]
            lines.append("Crops: " + ", ".join(crop_details))
        else:
            lines.append("Crops: No crop records available")

        if plot["trees"]:
            tree_details = [
                f"{t['name']} ({t['count']} trees)"
                for t in plot["trees"]
            ]
            lines.append("Trees: " + ", ".join(tree_details))
        else:
            lines.append("Trees: No tree records available")

        if plot["livestock"]:
            animal_details = [
                f"{a['type']} ({a['count']} animals)"
                for a in plot["livestock"]
            ]
            lines.append("Livestock: " + ", ".join(animal_details))
        else:
            lines.append("Livestock: No livestock records available")

    lines.extend([
        "",
        "DATA QUALITY:",
        f"Missing farmer fields: {', '.join(missing_fields) if missing_fields else 'None'}",
        f"Unassigned crop records: {len(unassigned_crops)}",
        
    ])

    retrieval_text = "\n".join(lines)

    return {
        "farmer_context": farmer_context,
        "landholdings": plot_contexts,
        "missing_fields": missing_fields,
        "unassigned_crop_count": len(unassigned_crops),
        "retrieval_text": retrieval_text
    }
