"""
Krishi Mitra — Chief Secretary Consultative Advisor (Wing 2).
Synthesizes multi-ministry schemes, application processes, and official FAQs
into an authoritative, grounded advisory response for Indian farmers.
"""

from typing import Any, Optional
from backend.reasoning.gemma_client import GemmaClient
from backend.reasoning.prompts import build_consultative_qa_prompt


class ConsultativeAdvisor:
    """Delivers cross-ministry executive guidance and FAQ resolutions to farmers."""

    def __init__(self, client: Optional[GemmaClient] = None):
        self.client = client or GemmaClient()

    def advise(
        self,
        question: str,
        evidence_chunks: list[dict[str, Any]],
        scheme_records: Optional[list[dict[str, Any]]] = None,
        farmer_context: Optional[dict[str, Any]] = None
    ) -> dict[str, Any]:
        """
        Synthesizes retrieved evidence, FAQs, and scheme dossiers into an executive response.
        Enforces honest refusal if no evidence is available.
        """
        # 1. Edge Case: No evidence retrieved from RAG at all
        if not evidence_chunks and not scheme_records:
            return {
                "has_sufficient_data": False,
                "executive_summary": (
                    "I have had the entire central and state government archives searched. "
                    "There are currently no official notified schemes, gazettes, or guidelines "
                    "matching your specific inquiry in the records. Do not rely on unverified claims "
                    "or middlemen. Please consult your local Block Development Office or Krishi Bhavan."
                ),
                "ministries_and_schemes_involved": [],
                "faq_and_procedural_solutions": [],
                "mandatory_document_checklist": [],
                "step_by_step_administrative_roadmap": [
                    "Step 1: Visit the nearest Block Development Office (BDO) or Agriculture Circle Officer.",
                    "Step 2: Inquire whether any district-level contingency funds or newly announced circulars apply."
                ],
                "official_verified_portals": [],
                "insufficient_data_notice": "No matching records found in the national scheme database."
            }

        # 2. Build Chief Secretary Cross-Ministry Prompt
        system_prompt, user_prompt = build_consultative_qa_prompt(
            farmer_question=question,
            evidence_chunks=evidence_chunks,
            scheme_records=scheme_records,
            farmer_context=farmer_context
        )

        # 3. Request executive synthesis from Gemma
        try:
            response = self.client.generate_json(
                prompt=user_prompt,
                system_prompt=system_prompt,
                temperature=0.1,
                max_tokens=1500
            )

            # Ensure boolean flag is strictly typed
            response["has_sufficient_data"] = bool(response.get("has_sufficient_data", True))
            return response

        except Exception as e:
            return {
                "has_sufficient_data": False,
                "error": True,
                "executive_summary": f"Chief Secretary advisory engine encountered an error: {str(e)}",
                "ministries_and_schemes_involved": [],
                "faq_and_procedural_solutions": [],
                "mandatory_document_checklist": [],
                "step_by_step_administrative_roadmap": []
            }