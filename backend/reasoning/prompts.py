"""
Krishi Mitra — Chief Secretary Comprehensive Dossier & FAQ Prompt Engine
Gives full priority to:
- Complete scheme records (Description, Benefits, Application Steps, Required Documents).
- Official FAQs (Real administrative precedents, troubleshooting, edge-case resolutions).
- Strict Zero-Hallucination & Honest Refusal protocols.
"""

from typing import Any, Optional


CHIEF_SECRETARY_SYSTEM_PROMPT = """You are the Chief Secretary to the Government of India, advising an Indian farmer with supreme administrative authority, complete cross-ministerial knowledge, and profound empathy.

YOUR OPERATIONAL RULES:
1. EXHAUSTIVE RECORD ANALYSIS: Review the FULL SCHEME DOSSIER provided—including Description, Benefits, Application Steps, Required Documents, and especially the official FAQs.
2. FAQ-FIRST RESOLUTION: Use official scheme FAQs to solve administrative hurdles (e.g., Aadhaar mismatch, bank account seeding, tenant land rights, rejected applications).
3. ABSOLUTE GROUNDING: Rely strictly on the provided OFFICIAL EVIDENCE. Never invent scheme names, subsidy amounts, application deadlines, or documents not present in the government records.
4. HONEST REFUSAL: If the provided records and FAQs do NOT contain verified government data for the inquiry, state clearly that official central/state records contain no verified notification for this query. Never guess.
5. INTER-MINISTERIAL CONVERGENCE: Connect all relevant ministries (Agriculture, Finance, Transport, Power, Rural Development/MGNREGA) into a unified roadmap.
6. JSON COMPLIANCE: Return ONLY a valid JSON object matching the exact requested schema. No conversational preamble or trailing text."""


def format_full_scheme_dossier(scheme: dict[str, Any], include_faqs: bool = True) -> str:
    """Formats the complete scheme record from the database into an executive dossier."""
    tags = scheme.get('tags', [])
    tags_str = ", ".join(tags) if isinstance(tags, list) else str(tags or '')

    lines = [
        "═══════════════════════════════════════════════════════════════",
        f"OFFICIAL DOSSIER: {scheme.get('scheme_name', 'Unnamed Scheme')}",
        "═══════════════════════════════════════════════════════════════",
        f"• Level: {scheme.get('level', 'Central / State')}",
        f"• Ministry / State: {scheme.get('state_ut_ministry', 'Unknown')}",
        f"• Application Mode: {scheme.get('application_mode', 'Online / Offline')}",
        f"• Categories / Tags: {tags_str}",
        f"\n1. SCHEME OBJECTIVE & DESCRIPTION:\n{scheme.get('description', 'N/A')}",
        f"\n2. OFFICIAL ELIGIBILITY CRITERIA:\n{scheme.get('eligibility_criteria', 'N/A')}",
        f"\n3. GENERAL ELIGIBILITY:\n{scheme.get('eligibility_general', 'N/A')}",
        f"\n4. EXCLUSIONS & DISQUALIFIERS:\n{scheme.get('exclusions_ineligibility', 'None recorded')}",
        f"\n5. FINANCIAL & MATERIAL BENEFITS:\n{scheme.get('benefits', 'N/A')}",
        f"\n6. STEP-BY-STEP APPLICATION PROCESS:\n{scheme.get('application_process', 'N/A')}",
        f"\n7. MANDATORY DOCUMENTS REQUIRED:\n{scheme.get('documents_required', 'N/A')}",
        f"\n8. OFFICIAL PORTAL LINK: {scheme.get('official_link', 'N/A')}",
        f"• MyScheme National URL: {scheme.get('myscheme_url', 'N/A')}"
    ]

    if include_faqs and scheme.get('faqs'):
        lines.append(f"\n9. OFFICIAL ADMINISTRATIVE PRECEDENTS & FAQs:\n{scheme.get('faqs')}")

    return "\n".join(lines)


# =====================================================================
# 1. ELIGIBILITY EVALUATION PROMPT (WING 1 — COMPLETE DOSSIER)
# =====================================================================

def build_eligibility_prompt(
    farmer_context: dict[str, Any],
    scheme_record: dict[str, Any],
    evidence_chunks: list[dict[str, Any]]
) -> tuple[str, str]:
    """
    Evaluates a farmer's profile against the complete scheme dossier,
    including eligibility, exclusions, benefits, and administrative FAQs.
    """
    dossier = format_full_scheme_dossier(scheme_record, include_faqs=True)

    evidence_formatted = []
    for c in evidence_chunks[:5]:
        section = c.get('section', c.get('section_type', 'GENERAL'))
        text = c.get('text', c.get('chunk_text', '')).strip()
        evidence_formatted.append(f"[Evidence Chunk | Section: {section}]\n{text}")

    evidence_text = "\n\n".join(evidence_formatted)

    user_prompt = f"""EXECUTIVE EVALUATION OF SCHEME ELIGIBILITY AND BENEFIT ALLOCATION.

FARMER PROFILE FACTS:
{farmer_context.get('retrieval_text', 'No structured profile available.')}

{dossier}

KEY RETRIEVED EVIDENCE CHUNKS:
{evidence_text or 'Dossier text provides complete evidence.'}

DIRECTIVES:
1. Cross-examine the farmer's facts against the Scheme Objective, Eligibility, Exclusions, and Official FAQs.
2. Check State/UT domicile, Social Category (`SC`/`ST`/`OBC`/Religious Minority), Gender, Age, Annual Family Income ceiling, Farmer Category (`Small/Marginal` vs `Medium/Large`), KCC status, and Landholding Ownership (`OWNED` vs `LEASED`/`TENANT`/`SHARED`).
3. MANDATORY MULTI-PLOT RULE: If the farmer holds at least one `OWNED` plot alongside additional `LEASED`/`TENANT` plots, evaluate owned-land eligibility (like PM-KISAN `"cultivable land holding in their names"`) as `PASS` based on the `OWNED` plot(s). However, if ALL plots are `LEASED` or `TENANT` with ZERO `OWNED` plots, strictly mark owned-land requirements as `FAIL` -> `INELIGIBLE`.
4. STRICT 4-STATE VERDICT MATRIX (ZERO CONTRADICTIONS ALLOWED):
   - Set `"verdict": "INELIGIBLE"` whenever ANY mandatory eligibility rule is marked `"FAIL"` (e.g., wrong State/UT, wrong Social Category SC/ST/Minority, wrong Gender, Age out of bounds, Family Income exceeding ceiling stated in Eligibility OR FAQs, Medium/Large farmer when restricted "Only small and marginal farmers", or LEASED-only on an owned-land scheme). NEVER return `"ELIGIBLE"` or `"UNCERTAIN_NEEDS_INFO"` when any mandatory rule failed!
   - Set `"verdict": "UNCERTAIN_NEEDS_INFO"` ONLY when ZERO rules are `"FAIL"` and at least one essential criterion is `"UNKNOWN"` from the profile facts.
   - Set `"verdict": "ELIGIBLE"` ONLY when ALL mandatory rules are `"PASS"` or `"NOT_APPLICABLE"`. When `"ELIGIBLE"`, `"disqualifying_factors"` MUST be `[]` (place advisory species/process cautions in `faq_insights_applied` instead).
5. In Stage 2, determine priority allocation standing (`HIGH` for reserved ST/SC/Small/Marginal/Women preference, else `MEDIUM`/`NORMAL`/`LOW`).
6. Output strictly a JSON object matching this schema:
{{
  "scheme_name": "{scheme_record.get('scheme_name')}",
  "stage_1_individual_eligibility": {{
    "verdict": "ELIGIBLE | INELIGIBLE | UNCERTAIN_NEEDS_INFO",
    "confidence_score": 0.0 to 1.0,
    "evaluated_conditions": [
      {{
        "condition_name": "Name of condition",
        "official_rule": "Exact rule from dossier",
        "farmer_fact": "Farmer's corresponding fact",
        "status": "PASS | FAIL | UNKNOWN | NOT_APPLICABLE",
        "reason": "Administrative explanation"
      }}
    ],
    "disqualifying_factors": ["list criteria marked FAIL, e.g. state mismatch, income ceiling"]
  }},
  "stage_2_allocation_priority": {{
    "priority_level": "HIGH | MEDIUM | NORMAL | LOW",
    "priority_rationale": "Analysis of category quota, landholding rank, or special reservation"
  }},
  "document_preparation_checklist": ["exact list of papers from Documents Required"],
  "faq_insights_applied": ["relevant solutions or clarifications extracted from official FAQs"],
  "chief_secretary_action_plan": {{
    "executive_summary": "Authoritative explanation of the decision",
    "entitlements_and_benefits": "Detailed summary of what the farmer will receive",
    "submission_roadmap": "Exact office, portal, or officer designation where file must be submitted",
    "official_portal_link": "{scheme_record.get('official_link') or scheme_record.get('myscheme_url') or 'N/A'}"
  }}
}}"""

    return CHIEF_SECRETARY_SYSTEM_PROMPT, user_prompt


# =====================================================================
# 2. CONSULTATIVE Q&A & FAQ ADVISOR PROMPT (WING 2 — CROSS-MINISTRY)
# =====================================================================

def build_consultative_qa_prompt(
    farmer_question: str,
    evidence_chunks: list[dict[str, Any]],
    scheme_records: Optional[list[dict[str, Any]]] = None,
    farmer_context: Optional[dict[str, Any]] = None
) -> tuple[str, str]:
    """
    Answers complex, cross-ministry questions (equipment, cow shed, Aadhaar/bank unblocking)
    using full scheme dossiers, official FAQs, and retrieved evidence chunks.
    Enforces honest refusal when data is absent.
    """

    profile_text = (
        farmer_context.get('retrieval_text', '')
        if farmer_context else "Anonymous farmer (No registered profile attached)."
    )

    # Format full scheme dossiers if available
    dossiers_text = ""
    if scheme_records:
        dossiers_text = "\n\n".join([
            format_full_scheme_dossier(s, include_faqs=True)
            for s in scheme_records[:3]
        ])

    # Format evidence chunks (which include dedicated FAQ chunks)
    evidence_formatted = []
    for i, c in enumerate(evidence_chunks):
        scheme = c.get('scheme', c.get('scheme_name', 'General'))
        section = c.get('section', c.get('section_type', 'GENERAL'))
        text = c.get('text', c.get('chunk_text', '')).strip()
        evidence_formatted.append(
            f"[Source {i+1} | Scheme: {scheme} | Section: {section}]\n{text}"
        )
    evidence_text = "\n\n".join(evidence_formatted)

    user_prompt = f"""THE FARMER HAS SOUGHT EXECUTIVE GUIDANCE FROM THE CHIEF SECRETARY.

FARMER'S QUESTION:
"{farmer_question}"

FARMER'S REGISTERED FACTS:
{profile_text}

OFFICIAL GOVERNMENT SCHEME DOSSIERS (FROM NATIONAL ARCHIVES):
{dossiers_text or 'No full dossiers attached. Refer to specific evidence chunks below.'}

RETRIEVED OFFICIAL EVIDENCE & FAQ PRECEDENTS:
{evidence_text or 'NO OFFICIAL RECORDS FOUND IN ARCHIVES.'}

EXECUTIVE DIRECTIVES:
1. CROSS-MINISTRY SYNTHESIS: If the inquiry involves machinery, farm infrastructure, or multi-faceted support, combine all relevant ministries present in the records (e.g. Agriculture subsidies + Finance interest subvention + Transport concessions + MGNREGA labor).
2. FAQ PROBLEM SOLVING: If the farmer faces administrative, banking, or document roadblocks (Aadhaar, bank seeding, certificate mismatch), search the FAQs in the dossier and provide the official workaround.
3. ABSOLUTE GROUNDING & HONEST REFUSAL:
   - If verified government data exists: Synthesize the official solution with citations.
   - If records lack verified data for this inquiry: Set "has_sufficient_data" to false and state clearly that official central/state records contain no verified notification for this query. DO NOT HALLUCINATE.
4. Output strictly a JSON object matching this schema:
{{
  "has_sufficient_data": true or false,
  "executive_summary": "Authoritative, dignified response addressing the core issue directly",
  "ministries_and_schemes_involved": [
    {{
      "ministry_or_department": "Official Ministry / Department Name",
      "scheme_name": "Official Scheme Name",
      "provisions_and_assistance": "Specific subsidy, capital grant, interest discount, or labor component"
    }}
  ],
  "faq_and_procedural_solutions": [
    "Specific solutions or administrative precedents extracted directly from official FAQs"
  ],
  "mandatory_document_checklist": [
    "Exact papers required based on the official dossiers"
  ],
  "step_by_step_administrative_roadmap": [
    "Step 1: Specific office to visit (e.g. Block Development Office, Krishi Bhavan, CSC)",
    "Step 2: Papers and forms to tender",
    "Step 3: Verification and fund disbursement mechanism"
  ],
  "official_verified_portals": ["list authentic portal links found in the records"],
  "insufficient_data_notice": "Only populate if has_sufficient_data is false. Explain what is missing."
}}"""

    return CHIEF_SECRETARY_SYSTEM_PROMPT, user_prompt