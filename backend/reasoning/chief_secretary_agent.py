"""
Krishi Mitra — Sovereign Chief Secretary Autonomous Agent.
Orchestrates multi-turn dynamic tool calling and Executive Chain-of-Thought (<executive_deliberation>)
to investigate, cross-examine, and solve complex farmer inquiries across all ministries.
"""

import json
from typing import Any, Optional
from backend.reasoning.gemma_client import GemmaClient
from backend.reasoning.tools import SecretariatToolkit


AGENT_SYSTEM_PROMPT = """You are the Chief Secretary to the Government of India, advising an Indian farmer with supreme administrative authority, complete cross-ministerial knowledge, and profound empathy.

YOU HAVE 4 SECRETARIAT TOOLS:
1. `get_farmer_facts(farmer_id)`: Fetches registered farmer details, landholdings, crops, livestock.
2. `search_schemes(keywords, ministry, state, limit)`: Searches official schemes across all ministries.
3. `search_faqs(issue_keywords, limit)`: Searches official FAQs for troubleshooting, edge cases, Aadhaar/bank unblocking.
4. `get_scheme_dossier(scheme_id)`: Pulls complete 17-column official government dossier.

OPERATIONAL RULES:
1. USE PRE-HYDRATED PROFILE FIRST: If REGISTERED FARMER FACTS are already provided in the prompt, use them directly (state, gender, social_category, farmer_category, annual_family_income, kcc_holder, landholdings/ownership_type, crops, trees, livestock) instead of spending a turn calling `get_farmer_facts`.
2. SEARCH STRATEGY (DO NOT OVER-FILTER): Note that State/UT schemes store the State name (e.g. 'Karnataka', 'Gujarat', 'Assam') in `state_ut_ministry`. Therefore, OMIT the `ministry` parameter when searching State schemes or general cross-ministry topics; only pass `state` (farmer's state) and clean `keywords`. For multi-need convergence queries covering income support, credit, insurance, and irrigation, call `search_schemes` with focused keywords (or `limit=6`) / multiple turns so PM-KISAN, KCC, PMFBY, and PMKSY/PM-KUSUM are all retrieved.
3. STATUTORY GROUNDING & REFUSALS: Rely strictly on facts returned by tools. Always check exact eligibility criteria (`OWNED` vs `LEASED`-only land for PM-KISAN vs tenant-friendly KCC/PMFBY, State residency, SC/ST/Women restrictions, family income ceilings).
4. `has_sufficient_data` RULE:
   - Set `"has_sufficient_data": true` when verified official schemes or official FAQ/procedural solutions were found across any Central/State records — INCLUDING when confirming a farmer is NOT eligible for an existing scheme (disqualified by gender, state, social category, income limit, or leased-only land).
   - Set `"has_sufficient_data": false` ONLY when the farmer asks about a specific scheme/act that does NOT exist in government records (leave `inter_ministerial_package: []` cleanly and state no official record exists) OR when no verified record matches the topic. Never invent scheme names, subsidies, or URLs.
5. PROFILE & DIRECT SUMMARY COMPLETENESS: When a farmer asks to confirm/check their profile details (state, district, land area, ownership type, KCC status, crops, trees, livestock), explicitly state EVERY requested figure cleanly in complete sentences inside `directive.executive_summary` (never end with 'are as follows:' with missing values).
6. JSON COMPACTNESS & CHAIN-OF-THOUGHT: Keep `"thought"` concise (1–2 sentences) and `"executive_deliberation"` under 150 words so JSON responses NEVER truncate mid-stream.

RESPONSE FORMAT:
In each turn, return strictly a JSON object with EITHER:

Option A (To call a tool):
{
  "thought": "Reason for calling this specific tool...",
  "action": "call_tool",
  "tool_name": "search_schemes | search_faqs | get_scheme_dossier | get_farmer_facts",
  "parameters": {"param_name": "value"}
}

Option B (When investigation is complete, produce the final directive):
{
  "thought": "I have gathered sufficient cross-ministerial evidence. Initiating executive deliberation...",
  "action": "final_directive",
  "executive_deliberation": "Detailed internal bureaucratic audit covering: 1. Jurisdiction 2. Fiscal Stacking 3. FAQ resolutions 4. Grounding verification",
  "directive": {
    "has_sufficient_data": true or false,
    "executive_summary": "Authoritative, dignified response addressing the farmer directly",
    "inter_ministerial_package": [
      {"ministry": "Ministry Name", "scheme_name": "Official Scheme Name", "provisions": "Exact subsidy/benefit"}
    ],
    "faq_and_procedural_resolutions": ["Official solutions to administrative hurdles"],
    "mandatory_document_checklist": ["Exact papers required based on dossiers"],
    "administrative_action_plan": [
      "Step 1: Specific office to approach (e.g. BDO, DAO, Bank)",
      "Step 2: Papers and forms to tender",
      "Step 3: Verification and sanction process"
    ],
    "official_portals": ["list authentic portal links found in records"],
    "insufficient_data_notice": "Only populate if has_sufficient_data is false"
  }
}"""


class ChiefSecretaryAgent:
    """Autonomous executive agent coordinating multi-turn tool investigations with Gemma."""

    def __init__(self, client: Optional[GemmaClient] = None, max_turns: int = 4):
        self.client = client or GemmaClient()
        self.toolkit = SecretariatToolkit()
        self.max_turns = max_turns

    def _chat_json_resilient(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.1,
        max_tokens: int = 2600,
    ) -> dict[str, Any]:
        """Call Gemma chat API and recover cleanly if JSON was truncated by token budget."""
        try:
            return self.client.chat(messages=messages, temperature=temperature, max_tokens=max_tokens)
        except ValueError:
            retry_msgs = list(messages) + [{
                "role": "user",
                "content": (
                    "Your previous JSON output was cut off before closing. "
                    "Keep 'thought' under 2 sentences and 'executive_deliberation' concise, "
                    "and immediately output a valid, complete JSON object matching Option B now."
                ),
            }]
            return self.client.chat(messages=retry_msgs, temperature=temperature, max_tokens=2800)

    def _execute_tool(self, tool_name: str, params: dict[str, Any]) -> Any:
        """Executes a tool call against the Secretariat Toolkit."""
        if not hasattr(self.toolkit, tool_name):
            return {"error": f"Tool '{tool_name}' does not exist in Secretariat Toolkit."}
        func = getattr(self.toolkit, tool_name)
        try:
            return func(**params)
        except Exception as e:
            return {"error": f"Tool execution failed: {str(e)}"}

    def consult(
        self,
        farmer_inquiry: str,
        farmer_id: Optional[int] = None,
        verbose: bool = True
    ) -> dict[str, Any]:
        """
        Runs the autonomous executive investigation loop for the farmer's inquiry.
        """
        conversation_history = [
            {"role": "system", "content": AGENT_SYSTEM_PROMPT}
        ]

        # Pre-hydrate verified farmer profile facts directly into initial prompt so Gemma never
        # wastes a turn or answers blind when farmer_id is specified.
        farmer_facts_block = ""
        if farmer_id is not None:
            facts = self.toolkit.get_farmer_facts(int(farmer_id))
            if facts.get("found"):
                farmer_facts_block = (
                    f"\nREGISTERED FARMER FACTS (VERIFIED FROM POSTGRESQL FOR FARMER ID {farmer_id}):\n"
                    f"{facts.get('retrieval_text', '')}\n"
                )
            else:
                farmer_facts_block = f"\nREGISTERED FARMER FACTS: Farmer ID {farmer_id} not found in database.\n"

        # Initial prompt with inquiry and grounded profile
        user_msg = (
            f"FARMER INQUIRY: \"{farmer_inquiry}\"\n"
            f"FARMER ID: {farmer_id or 'Not specified'}\n"
            f"{farmer_facts_block}\n"
            "Begin your executive investigation. Call `search_schemes`, `search_faqs`, or `get_scheme_dossier` "
            "to gather verified government evidence (omit `ministry` unless targeting a single Central ministry). "
            "Once you have all facts, emit Option B ('action': 'final_directive')."
        )
        conversation_history.append({"role": "user", "content": user_msg})

        final_result = None

        for turn in range(1, self.max_turns + 1):
            if verbose:
                print(f"\n--- [Turn {turn}/{self.max_turns}] Chief Secretary Deliberating ---")

            # Send full conversation history
            response = self._chat_json_resilient(
                messages=conversation_history,
                temperature=0.1,
                max_tokens=2600
            )

            action = response.get("action")
            thought = response.get("thought", "")
            inferred_tool = response.get("tool_name") or response.get("tool") or ""

            if verbose:
                print(f"Thought: {thought}")

            # Case A: Gemma delivers a complete final executive directive
            if action == "final_directive" and isinstance(response.get("directive"), dict) and response.get("directive"):
                if verbose:
                    print("\n🎯 Final Directive Formulated with Executive Deliberation.")
                final_result = response
                break

            # Case B: Gemma calls a tool to gather evidence (tolerant if 'action' omitted alongside tool_name)
            elif action == "call_tool" or inferred_tool:
                tool_name = inferred_tool
                params = response.get("parameters") or response.get("args") or {}
                if not isinstance(params, dict):
                    params = {}

                if verbose:
                    print(f"🛠️ Executing Tool: {tool_name}({params})")

                observation = self._execute_tool(tool_name, params)

                # Append assistant tool call and user tool observation to multi-turn memory
                conversation_history.append({"role": "assistant", "content": json.dumps(response)})
                tool_feedback = (
                    f"OBSERVATION FROM '{tool_name}':\n"
                    f"{json.dumps(observation, indent=2, ensure_ascii=False)[:5500]}\n\n"
                    f"Reminder of Farmer's Question: \"{farmer_inquiry}\". "
                    "Call another tool if more cross-department evidence is needed, or output Option B ('final_directive')."
                )
                conversation_history.append({"role": "user", "content": tool_feedback})

            # Case C: Gemma returned flat directive fields without the outer wrapper
            elif any(k in response for k in ("executive_summary", "summary", "inter_ministerial_package")):
                final_result = self._normalize_final_result(response)
                break

            # Case D: Malformed/plan-only turn (no tool call and no directive) — nudge once instead of aborting!
            else:
                if turn < self.max_turns:
                    conversation_history.append({"role": "assistant", "content": json.dumps(response)})
                    conversation_history.append({
                        "role": "user",
                        "content": (
                            "Your previous output had no 'action' tool call or 'directive'. "
                            "Do not describe your plan in 'thought' alone—actually call `search_schemes` / `search_faqs` / `get_scheme_dossier` "
                            "using Option A ('action': 'call_tool'), OR emit complete Option B JSON with 'action': 'final_directive' and 'directive'."
                        )
                    })
                    continue
                final_result = self._normalize_final_result(response)
                break

        if not final_result:
            if verbose:
                print("⏱️ Compiling final executive directive...")
            conversation_history.append({
                "role": "user",
                "content": (
                    "Investigation turns complete. Do NOT call any more tools. "
                    "Immediately output Option B JSON with \"action\": \"final_directive\", "
                    "\"executive_deliberation\", and a complete \"directive\" object matching the schema."
                )
            })
            raw_final = self._chat_json_resilient(
                messages=conversation_history,
                temperature=0.1,
                max_tokens=2800
            )
            final_result = self._normalize_final_result(raw_final)

        return final_result

    @staticmethod
    def _normalize_final_result(raw: Any) -> dict[str, Any]:
        """Ensure returned payload always contains `executive_deliberation` and non-empty `directive` dict."""
        if not isinstance(raw, dict):
            return {
                "action": "final_directive",
                "executive_deliberation": "Executive review completed.",
                "directive": {"has_sufficient_data": False, "executive_summary": str(raw)}
            }
        delib = raw.get("executive_deliberation") or raw.get("thought") or "Executive deliberation completed."
        directive = raw.get("directive")
        if not isinstance(directive, dict) or not directive:
            # Handle flat directive JSON or truncated final turn
            if any(k in raw for k in ("executive_summary", "summary", "inter_ministerial_package", "has_sufficient_data")):
                directive = {
                    k: v for k, v in raw.items()
                    if k not in ("action", "thought", "executive_deliberation")
                }
            else:
                directive = {
                    "has_sufficient_data": False,
                    "executive_summary": raw.get("thought") or "Could not finalize structured directive; please retry or narrow your question.",
                    "inter_ministerial_package": [],
                    "faq_and_procedural_resolutions": [],
                    "mandatory_document_checklist": [],
                    "administrative_action_plan": [],
                    "official_portals": []
                }
        return {
            "action": "final_directive",
            "executive_deliberation": delib,
            "directive": directive,
        }