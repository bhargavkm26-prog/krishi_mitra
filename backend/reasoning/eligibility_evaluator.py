"""
Krishi Mitra — Chief Secretary Eligibility Evaluation Engine (Wing 1).
Evaluates farmer facts against hydrated scheme dossiers and ColBERT evidence.
Separates Stage 1 (Statutory Eligibility) from Stage 2 (Quota & Beneficiary Allocation).
"""

from typing import Any, Optional
from backend.reasoning.gemma_client import GemmaClient
from backend.reasoning.prompts import build_eligibility_prompt


class EligibilityEvaluator:
    """Executes executive eligibility evaluations for a farmer across candidate schemes."""

    def __init__(self, client: Optional[GemmaClient] = None):
        self.client = client or GemmaClient()

    def evaluate_single_scheme(
        self,
        farmer_context: dict[str, Any],
        scheme_record: dict[str, Any],
        evidence_chunks: Optional[list[dict[str, Any]]] = None
    ) -> dict[str, Any]:
        """
        Submits one scheme dossier + farmer profile to Gemma for executive evaluation.
        """
        evidence = evidence_chunks or []
        system_prompt, user_prompt = build_eligibility_prompt(
            farmer_context=farmer_context,
            scheme_record=scheme_record,
            evidence_chunks=evidence
        )

        try:
            verdict = self.client.generate_json(
                prompt=user_prompt,
                system_prompt=system_prompt,
                temperature=0.1,
                max_tokens=1500
            )
            # Attach source scheme ID for end-to-end traceability
            verdict["scheme_id"] = scheme_record.get("id")
            verdict["state_ut_ministry"] = scheme_record.get("state_ut_ministry")
            verdict["level"] = scheme_record.get("level")
            return verdict

        except Exception as e:
            return {
                "scheme_id": scheme_record.get("id"),
                "scheme_name": scheme_record.get("scheme_name"),
                "error": True,
                "error_message": f"Evaluation failed: {str(e)}",
                "stage_1_individual_eligibility": {
                    "verdict": "UNCERTAIN_NEEDS_INFO",
                    "confidence_score": 0.0
                }
            }

    def evaluate_farmer_schemes(
        self,
        farmer_context: dict[str, Any],
        candidate_schemes: list[dict[str, Any]],
        max_schemes: int = 5
    ) -> dict[str, Any]:
        """
        Evaluates the top candidate schemes sequentially to prevent VRAM spikes.
        Buckets the results into: Eligible, Conditional/Needs Info, and Ineligible.
        """
        evaluated_results = []
        schemes_to_process = candidate_schemes[:max_schemes]

        for item in schemes_to_process:
            # Handle both raw scheme_record dict or wrapped retrieval item
            record = item.get("scheme_record") or item
            chunks = item.get("evidence_chunks") or []

            verdict = self.evaluate_single_scheme(
                farmer_context=farmer_context,
                scheme_record=record,
                evidence_chunks=chunks
            )
            evaluated_results.append(verdict)

        # Categorize results
        eligible = []
        conditional = []
        ineligible = []

        # Priority weight mapping for Stage 2 sorting
        priority_rank = {"HIGH": 3, "MEDIUM": 2, "NORMAL": 1, "LOW": 0}

        for res in evaluated_results:
            stage1 = res.get("stage_1_individual_eligibility", {})
            verdict_status = stage1.get("verdict", "UNCERTAIN_NEEDS_INFO")

            if verdict_status == "ELIGIBLE":
                eligible.append(res)
            elif verdict_status == "INELIGIBLE":
                ineligible.append(res)
            else:
                conditional.append(res)

        # Sort eligible schemes by Stage 2 allocation priority
        eligible.sort(
            key=lambda x: priority_rank.get(
                x.get("stage_2_allocation_priority", {}).get("priority_level", "NORMAL"), 1
            ),
            reverse=True
        )

        return {
            "total_schemes_evaluated": len(evaluated_results),
            "eligible_count": len(eligible),
            "conditional_count": len(conditional),
            "ineligible_count": len(ineligible),
            "eligible_schemes": eligible,
            "conditional_schemes": conditional,
            "ineligible_schemes": ineligible
        }