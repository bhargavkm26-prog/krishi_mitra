"""
Krishi Mitra — Chief Secretary Eligibility Evaluation Engine (Wing 1).
Evaluates farmer facts against hydrated scheme dossiers and ColBERT evidence.
Separates Stage 1 (Statutory Eligibility) from Stage 2 (Quota & Beneficiary Allocation).
"""

import re
from typing import Any, Optional
from backend.reasoning.gemma_client import GemmaClient
from backend.reasoning.prompts import build_eligibility_prompt


class EligibilityEvaluator:
    """Executes executive eligibility evaluations for a farmer across candidate schemes."""

    _HARD_FAIL_RE = re.compile(
        r"(state mismatch|not a (permanent )?resident|resides in|category mismatch|"
        r"requires (sc|st|scheduled caste|scheduled tribe|women|female|minority)|"
        r"only (for )?(women|female|small|marginal|sc|st)|exceeds?|exceeding|"
        r"income (ceiling|limit)|age (limit|exceeds|between)|gender mismatch|"
        r"leased vs owned|requires owned)",
        re.IGNORECASE,
    )

    def __init__(self, client: Optional[GemmaClient] = None):
        self.client = client or GemmaClient()

    @classmethod
    def _reconcile_verdict(
        cls,
        verdict: dict[str, Any],
        farmer_context: dict[str, Any],
        scheme_record: dict[str, Any],
    ) -> dict[str, Any]:
        """Enforce deterministic consistency between evaluated conditions, DB facts, and Stage 1 verdict."""
        stage1 = verdict.setdefault("stage_1_individual_eligibility", {})
        conds = stage1.get("evaluated_conditions") or []
        disq = stage1.get("disqualifying_factors") or []
        if not isinstance(disq, list):
            disq = [str(disq)]

        fc = farmer_context.get("farmer_context") or {}
        plots = farmer_context.get("landholdings") or []
        f_state = str(fc.get("state") or "").strip()
        f_soc = str(fc.get("social_category") or "").strip().upper()
        f_gender = str(fc.get("gender") or "").strip().lower()
        owns = {str(p.get("ownership_type") or "").strip().upper() for p in plots if p.get("ownership_type")}

        # 1. Deterministic statutory checks on unambiguous metadata
        lvl = str(scheme_record.get("level") or "")
        s_min = str(scheme_record.get("state_ut_ministry") or "")
        s_name_low = str(scheme_record.get("scheme_name") or "").lower()

        if lvl == "State / UT Government" and f_state and f_state.lower() not in s_min.lower():
            stage1["verdict"] = "INELIGIBLE"
            if not any("state" in str(x).lower() or "resident" in str(x).lower() for x in disq):
                disq.insert(0, f"State Mismatch: Farmer resides in {f_state}, scheme restricted to {s_min}.")

        if ("scheduled caste" in s_name_low or "for sc" in s_name_low) and f_soc and f_soc != "SC":
            stage1["verdict"] = "INELIGIBLE"
            if not any("sc" in str(x).lower() or "category" in str(x).lower() for x in disq):
                disq.insert(0, f"Social Category Mismatch: Farmer is {f_soc}, scheme reserved for Scheduled Caste (SC).")

        if ("scheduled tribe" in s_name_low or "for st" in s_name_low) and f_soc and f_soc != "ST":
            stage1["verdict"] = "INELIGIBLE"
            if not any("st" in str(x).lower() or "category" in str(x).lower() for x in disq):
                disq.insert(0, f"Social Category Mismatch: Farmer is {f_soc}, scheme reserved for Scheduled Tribe (ST).")

        if "pm-kisan" in str(scheme_record.get("scheme_slug") or "").lower() or "kisan samman nidhi" in s_name_low:
            if owns and "OWNED" not in owns and "SHARED" not in owns and owns.issubset({"LEASED", "TENANT"}):
                stage1["verdict"] = "INELIGIBLE"
                if not any("owned" in str(x).lower() or "leased" in str(x).lower() for x in disq):
                    disq.insert(0, "Land Ownership Mismatch: PM-KISAN requires cultivable landholding owned in applicant's name (profile has only LEASED/TENANT land).")

        f_cat = str(fc.get("farmer_category") or "").strip().lower()
        s_elig_low = str(scheme_record.get("eligibility_criteria") or "").lower()

        if "only small and marginal farmers" in s_elig_low and f_cat in ("semi-medium", "medium", "large"):
            stage1["verdict"] = "INELIGIBLE"
            if not any("small" in str(x).lower() or "marginal" in str(x).lower() for x in disq):
                disq.insert(0, f"Farmer Category Mismatch: Scheme restricts eligibility to Small/Marginal farmers only (profile is {fc.get('farmer_category')}).")

        if "udyogini" in s_name_low and f_gender == "male":
            stage1["verdict"] = "INELIGIBLE"
            if not any("gender" in str(x).lower() or "women" in str(x).lower() or "male" in str(x).lower() for x in disq):
                disq.insert(0, "Gender Mismatch: Scheme is restricted to women applicants (profile recorded as Male).")

        # 2. Reconcile LLM evaluated_conditions FAIL or hard disqualifiers with Stage 1 verdict
        has_fail_cond = any(
            isinstance(c, dict) and str(c.get("status", "")).upper() == "FAIL"
            for c in conds
        )
        has_hard_disq_text = any(cls._HARD_FAIL_RE.search(str(d)) for d in disq)

        if has_fail_cond or has_hard_disq_text:
            stage1["verdict"] = "INELIGIBLE"

        if str(stage1.get("verdict", "")).upper() == "ELIGIBLE":
            # Prevent contradictory disqualifiers on verified ELIGIBLE cards
            disq = []

        stage1["disqualifying_factors"] = disq
        return verdict

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
            verdict = self._reconcile_verdict(verdict, farmer_context, scheme_record)
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