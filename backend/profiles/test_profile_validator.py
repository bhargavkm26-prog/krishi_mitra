
import json

from backend.profiles.profile_aggregator import get_farmer_profile
from backend.profiles.profile_validator import validate_farmer_profile


farmer_id = 1

profile = get_farmer_profile(farmer_id)

result = validate_farmer_profile(profile)

print(json.dumps(result, indent=4))
