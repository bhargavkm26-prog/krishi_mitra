
from backend.database.connection import get_connection
from backend.ingestion.chunker import parse_faqs

connection = get_connection()

try:
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT id, scheme_name, faqs
            FROM public.schemes
            ORDER BY id
        """)

        schemes = cursor.fetchall()

finally:
    connection.close()


problem_count = 0

for scheme_id, scheme_name, faq_text in schemes:

    if not faq_text:
        continue

    parsed_faqs = parse_faqs(faq_text)

    for index, faq in enumerate(parsed_faqs, start=1):

        status = faq["parse_status"]

        if status == "complete":
            continue

        problem_count += 1

        print("\n" + "=" * 75)
        print("SCHEME ID:", scheme_id)
        print("SCHEME:", scheme_name)
        print("FAQ NUMBER:", index)
        print("STATUS:", status)

        print("\nPARSED QUESTION:")
        print(faq["question"])

        print("\nPARSED ANSWER:")
        print(faq["answer"] or "[EMPTY]")

        print("\nORIGINAL FAQ SOURCE:")
        print(faq_text)

print("\n" + "=" * 75)
print("TOTAL PROBLEMATIC FAQ RECORDS:", problem_count)
