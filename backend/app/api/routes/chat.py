import asyncio
import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.routes.auth import get_current_user
from app.core.config import LLM_API_KEY, LLM_BASE_URL, LLM_MODEL, LLM_TIMEOUT_SECONDS
from app.models.roles import UserRole
from app.models.user import User
from app.schemas.chat import ChatRequest, ChatResponse

router = APIRouter(prefix="/chat", tags=["AI chat"])
ALLOWED_ROLES = {UserRole.PATIENT, UserRole.DOCTOR}
SYSTEM_PROMPT = (
    "You are Carecell's health information assistant. Give clear, empathetic, general health information. "
    "Do not diagnose, prescribe, or claim to replace a qualified clinician. Encourage users to consult their "
    "healthcare professional for personal medical decisions. For potentially life-threatening symptoms, advise "
    "seeking emergency services immediately. Do not claim to have accessed medical records."
)


def _request_model(messages: list[dict[str, str]]) -> str:
    payload = json.dumps({"model": LLM_MODEL, "messages": messages, "temperature": 0.4}).encode("utf-8")
    request = Request(
        f"{LLM_BASE_URL}/chat/completions",
        data=payload,
        headers={
            "Authorization": f"Bearer {LLM_API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=LLM_TIMEOUT_SECONDS) as response:
            result = json.loads(response.read())
    except HTTPError as error:
        # Do not return upstream response bodies; they may contain provider details.
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The AI assistant is temporarily unavailable. Please try again.",
        ) from error
    except (URLError, TimeoutError, json.JSONDecodeError) as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The AI assistant could not be reached. Please try again.",
        ) from error

    try:
        message = result["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The AI assistant returned an invalid response.",
        ) from error
    if not isinstance(message, str) or not message.strip():
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="The AI assistant returned an empty response.")
    return message.strip()


@router.post("", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    user: User = Depends(get_current_user),
) -> ChatResponse:
    if user.role not in ALLOWED_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Patient or doctor access is required.")
    if not LLM_API_KEY:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI chat is not configured. Set LLM_API_KEY in the backend environment.")

    conversation = [{"role": message.role, "content": message.content} for message in payload.messages]
    messages = [{"role": "system", "content": SYSTEM_PROMPT}, *conversation]
    answer = await asyncio.to_thread(_request_model, messages)
    return ChatResponse(message=answer)