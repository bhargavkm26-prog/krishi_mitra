
import json

from backend.profiles.profile_aggregator import get_farmer_profile
from backend.profiles.profile_context_builder import build_farmer_context


farmer_id = 1

profile = get_farmer_profile(farmer_id)

context = build_farmer_context(profile)

print("\n========== FARMER CONTEXT ==========\n")

print(json.dumps(
    context["farmer_context"],
    indent=4
))

print("\n========== RETRIEVAL TEXT ==========\n")

print(context["retrieval_text"])
