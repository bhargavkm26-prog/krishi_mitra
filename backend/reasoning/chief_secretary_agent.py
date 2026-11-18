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
1. DYNAMIC INVESTIGATION: When an inquiry involves multiple needs (e.g. machinery + loan + Aadhaar issue), call your tools sequentially to gather evidence across departments.
2. ABSOLUTE GROUNDING: Rely strictly on facts returned by tools. Never invent scheme names, subsidy numbers, or rules not in the evidence.
3. HONEST REFUSAL: If tool searches return no verified government records for an inquiry, state clearly that no official notification exists. Never guess.
4. EXECUTIVE CHAIN-OF-THOUGHT: Before producing the final citizen directive, you MUST deliberate internally in `executive_deliberation` checking:
   - Jurisdictional validity (State vs Central)
   - Cross-ministerial convergence (Agriculture + Finance + Transport + Power + Rural Dev)
   - Administrative unblocking (resolving Aadhaar/DBT blocks from FAQs)
   - Grounding check (ensuring all numbers come from evidence)

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

        # Initial prompt with inquiry and instructions
        user_msg = (
            f"FARMER INQUIRY: \"{farmer_inquiry}\"\n"
            f"FARMER ID: {farmer_id or 'Not specified'}\n\n"
            "Begin your executive investigation. If you need farmer facts, scheme dossiers, or FAQs, "
            "call your tools. Once you have all cross-ministerial facts, emit 'final_directive'."
        )
        conversation_history.append({"role": "user", "content": user_msg})

        final_result = None

        for turn in range(1, self.max_turns + 1):
            if verbose:
                print(f"\n--- [Turn {turn}/{self.max_turns}] Chief Secretary Deliberating ---")

            # Send full conversation history
            response = self.client.chat(
                messages=conversation_history,
                temperature=0.1,
                max_tokens=2000
            )

            action = response.get("action")
            thought = response.get("thought", "")

            if verbose:
                print(f"Thought: {thought}")

            # Case A: Gemma delivers the final executive directive
            if action == "final_directive":
                if verbose:
                    print("\n🎯 Final Directive Formulated with Executive Deliberation.")
                final_result = response
                break

            # Case B: Gemma calls a tool to gather evidence
            elif action == "call_tool":
                tool_name = response.get("tool_name", "")
                params = response.get("parameters", {})

                if verbose:
                    print(f"🛠️ Executing Tool: {tool_name}({params})")

                observation = self._execute_tool(tool_name, params)

                # Append assistant tool call and user tool observation to multi-turn memory
                conversation_history.append({"role": "assistant", "content": json.dumps(response)})
                tool_feedback = (
                    f"OBSERVATION FROM '{tool_name}':\n"
                    f"{json.dumps(observation, indent=2, ensure_ascii=False)[:3000]}\n\n"
                    f"Reminder of Farmer's Question: \"{farmer_inquiry}\". "
                    "Call another tool if more cross-department data is needed, or output 'final_directive'."
                )
                conversation_history.append({"role": "user", "content": tool_feedback})

            else:
                final_result = {
                    "action": "final_directive",
                    "executive_deliberation": "Deliberation completed.",
                    "directive": response
                }
                break

        if not final_result:
            if verbose:
                print("⏱️ Compiling final executive directive...")
            conversation_history.append({
                "role": "user",
                "content": "Conclude your investigation and return the 'final_directive' JSON now."
            })
            final_result = self.client.chat(messages=conversation_history, temperature=0.1)

        return final_result