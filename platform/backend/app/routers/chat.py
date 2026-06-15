"""
Chat endpoint — OpenAI-compatible API, any provider.
Tools are the same ones exposed by the MCP server (same _dispatch, same TOOLS).
"""
import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.routers.mcp_server import TOOLS, _dispatch

router = APIRouter(prefix="/chat", tags=["chat"])

# ── MCP → OpenAI tool format ──────────────────────────────────────────────────

OPENAI_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": t["name"],
            "description": t["description"],
            "parameters": t["inputSchema"],
        },
    }
    for t in TOOLS
]

# ── Schema ────────────────────────────────────────────────────────────────────

class Msg(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: list[Msg] = []
    api_key: str
    base_url: str = "https://openrouter.ai/api/v1"
    model: str = "anthropic/claude-opus-4-5"

# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("")
async def chat(
    body: ChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not body.api_key.strip():
        raise HTTPException(status_code=422, detail="api_key required")

    try:
        from openai import OpenAI
        client = OpenAI(api_key=body.api_key, base_url=body.base_url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to init client: {e}")

    system = (
        f"You are a backend learning assistant for {user.name}. "
        "The user is learning Python, FastAPI, SQL, and HTTP on a study platform. "
        "You have tools to access their exercises, progress, books, and learning profile. "
        "Keep answers concise and practical. Answer in Portuguese unless the user writes in English. "
        "\n\n"
        "## Session start protocol\n"
        "1. Call get_context() — this returns a profile_summary.\n"
        "2. If profile_summary.baseline_done is false: conduct a brief diagnostic assessment "
        "(3-5 open questions about code/concepts, at least one requiring code reading). "
        "After gathering enough observations, call create_profile() with your analysis. "
        "Then confirm: 'Registrei seu perfil inicial. Identifiquei X lacunas prioritárias.'\n"
        "3. If profile_summary.baseline_done is true: use the profile to personalize your responses.\n"
        "\n"
        "## Profile usage rules\n"
        "- Before creating an exercise or course, call get_profile() and use gaps as concept targets "
        "and style to calibrate difficulty and tone.\n"
        "- During a session, if you observe something significant about the user's understanding "
        "(correct intuition, wrong concept, vocabulary gap), call add_profile_note().\n"
        "- If analytics contradict profile gaps (e.g., user now passes all sql:joins exercises), "
        "call update_profile('gaps', updated_gaps_list) to reflect the improvement.\n"
        "- Recommendations in the profile should drive book and content suggestions."
    )

    messages: list = [{"role": "system", "content": system}]
    messages += [{"role": m.role, "content": m.content} for m in body.history]
    messages.append({"role": "user", "content": body.message})

    # Agentic tool loop — max 8 rounds to avoid infinite loops
    for _ in range(8):
        try:
            resp = client.chat.completions.create(
                model=body.model,
                messages=messages,
                tools=OPENAI_TOOLS,
                tool_choice="auto",
                max_tokens=2048,
            )
        except Exception as e:
            raise HTTPException(status_code=502, detail=str(e))

        choice = resp.choices[0]

        if choice.finish_reason == "tool_calls" and choice.message.tool_calls:
            # Append assistant message with tool_calls
            messages.append(choice.message)

            for tc in choice.message.tool_calls:
                try:
                    args = json.loads(tc.function.arguments or "{}")
                except json.JSONDecodeError:
                    args = {}
                result = await _dispatch(tc.function.name, args, user, db)
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": json.dumps(result, ensure_ascii=False),
                })
        else:
            text = choice.message.content or ""
            return {"response": text}

    raise HTTPException(status_code=500, detail="tool_call loop exceeded")
