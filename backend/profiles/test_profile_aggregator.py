
import json

from backend.profiles.profile_aggregator import get_farmer_profile


if __name__ == "__main__":

    farmer_id = 1

    profile = get_farmer_profile(farmer_id)

    if profile is None:
        print(f"Farmer {farmer_id} not found.")

    else:
        print(json.dumps(profile, indent=4, ensure_ascii=False))


