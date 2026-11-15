
import sys
from pathlib import Path

# Ensure project root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.database.queries import (
    get_all_schemes,
    get_scheme_by_id,
    get_schemes_by_state_or_ministry,
    get_schemes_by_tags
)


# Test 1: Retrieve all schemes
schemes = get_all_schemes()

print("\nTEST 1: ALL SCHEMES")
print("Total schemes:", len(schemes))

if schemes:
    print("Available columns:", list(schemes[0].keys()))


# Test 2: Retrieve first scheme
if schemes:
    scheme_id = schemes[0]["id"]

    scheme = get_scheme_by_id(scheme_id)

    print("\nTEST 2: SINGLE SCHEME")
    print("ID:", scheme["id"])
    print("Name:", scheme["scheme_name"])


# Test 3: Search by ministry or state
results = get_schemes_by_state_or_ministry("Karnataka")

print("\nTEST 3: STATE SEARCH")
print("Matching schemes:", len(results))


# Test 4: Search by tags
results = get_schemes_by_tags(["Farmer", "Agriculture"])

print("\nTEST 4: TAG SEARCH")
print("Matching schemes:", len(results))

print("\nAll database tests completed.")
