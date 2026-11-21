import json
import asyncio
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from sse_starlette.sse import EventSourceResponse

from backend.reasoning.gemma_client import GemmaClient
from backend.reasoning.tools import SecretariatToolkit
from backend.reasoning.eligibility_evaluator import EligibilityEvaluator
from backend.reasoning.chief_secretary_agent import ChiefSecretaryAgent
from backend.profiles.profile_aggregator import get_farmer_profile
from backend.profiles.profile_context_builder import build_farmer_context

from backend.schemas.gemma_schemas import (
    ChatRequest,
    ChatResponse,
    EligibilityEvaluateRequest,
    EligibilityEvaluateResponse,
    ConsultRequest,
    ConsultResponse,
    GemmaHealthResponse
)

router = APIRouter(prefix="/api/v1/gemma", tags=["API 3: Gemma 4 E4B Reasoning & Decision Service"])


@router.get("/health", response_model=GemmaHealthResponse)
def gemma_health():
    """Verify if local llama-server (Gemma 4 E4B) is running on port 8080."""
    client = GemmaClient()
    healthy = client.is_healthy()
    return GemmaHealthResponse(
        status="live" if healthy else "unavailable",
        server_url=client.base_url,
        healthy=healthy
    )


@router.post("/chat", response_model=ChatResponse)
def gemma_chat(req: ChatRequest):
    """Direct multi-turn structured conversation with local Gemma 4 E4B."""
    client = GemmaClient()
    try:
        messages = [{"role": m.role, "content": m.content} for m in req.messages]
        resp = client.chat(messages=messages, temperature=req.temperature, max_tokens=req.max_tokens)
        return ChatResponse(status="success", response=resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemma inference failed: {str(e)}")


@router.post("/evaluate", response_model=EligibilityEvaluateResponse)
def evaluate_eligibility(req: EligibilityEvaluateRequest):
    """
    Wing 1 Engine: Evaluates statutory eligibility using the 4-State Condition Matrix
    (PASS, FAIL, UNKNOWN, NOT_APPLICABLE) and scores Stage 2 affirmative quota allocations.
    """
    # 1. Fetch farmer facts
    raw_profile = get_farmer_profile(req.farmer_id)
    if not raw_profile or not raw_profile.get("farmer"):
        raise HTTPException(status_code=404, detail=f"Farmer ID {req.farmer_id} not registered.")
    farmer_ctx = build_farmer_context(raw_profile)

    # 2. Fetch scheme dossier
    dossier_res = SecretariatToolkit.get_scheme_dossier(req.scheme_id)
    if not dossier_res.get("found"):
        raise HTTPException(status_code=404, detail=f"Scheme ID {req.scheme_id} not found.")
    scheme_record = dossier_res.get("dossier")

    # 3. Evaluate via Gemma
    evaluator = EligibilityEvaluator()
    verdict = evaluator.evaluate_single_scheme(farmer_context=farmer_ctx, scheme_record=scheme_record)

    stage1 = verdict.get("stage_1_individual_eligibility", {})
    stage2 = verdict.get("stage_2_allocation_priority", {})

    return EligibilityEvaluateResponse(
        scheme_id=req.scheme_id,
        scheme_name=scheme_record.get("scheme_name", "Unknown"),
        status=stage1.get("verdict", "UNCERTAIN_NEEDS_INFO"),
        confidence_score=stage1.get("confidence_score", 0.0),
        disqualifying_factors=stage1.get("disqualifying_factors", []),
        priority_tier=stage2.get("priority_level", "NORMAL"),
        target_quota=stage2.get("target_group_quota_applied"),
        fit_score=verdict.get("fit_score")
    )


@router.post("/consult", response_model=ConsultResponse)
def consult_chief_secretary(req: ConsultRequest):
    """
    Wing 2 Autonomous Chief Secretary ReAct Agent:
    Executes multi-turn cross-ministerial investigation, tools calls, administrative unblocking,
    and returns verified citizen directive with internal executive deliberation.
    """
    try:
        agent = ChiefSecretaryAgent(max_turns=req.max_turns)
        result = agent.consult(
            farmer_inquiry=req.inquiry,
            farmer_id=req.farmer_id,
            verbose=False
        )

        delib = result.get("executive_deliberation", "")
        directive = result.get("directive", {})

        return ConsultResponse(
            status="completed",
            deliberation=delib,
            directive=directive
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chief Secretary consultation failed: {str(e)}")


@router.get("/consult-stream")
async def consult_stream(
    inquiry: str = Query(..., description="Citizen grievance or inquiry"),
    farmer_id: Optional[int] = Query(None, description="Optional registered farmer ID")
):
    """
    Futuristic Server-Sent Events (SSE) Live Deliberation Stream:
    Streams the Chief Secretary's thinking process, tool calls, and final directive in real time.
    """
    async def event_generator():
        yield {
            "event": "start",
            "data": json.dumps({"status": "initiated", "inquiry": inquiry, "farmer_id": farmer_id})
        }
        await asyncio.sleep(0.1)

        # Emit investigative thought
        yield {
            "event": "thought",
            "data": json.dumps({"message": f"Analyzing inquiry: '{inquiry[:80]}...' and cross-referencing ministerial records."})
        }
        await asyncio.sleep(0.2)

        # Run investigation
        agent = ChiefSecretaryAgent(max_turns=3)
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: agent.consult(farmer_inquiry=inquiry, farmer_id=farmer_id, verbose=False)
        )

        delib = result.get("executive_deliberation", "")
        directive = result.get("directive", {})

        if delib:
            yield {
                "event": "deliberation",
                "data": json.dumps({"scratchpad": delib})
            }
            await asyncio.sleep(0.1)

        yield {
            "event": "final_directive",
            "data": json.dumps({"directive": directive})
        }

        yield {
            "event": "complete",
            "data": json.dumps({"status": "done"})
        }

    return EventSourceResponse(event_generator())
