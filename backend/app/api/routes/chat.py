import asyncio
import json
import logging
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.routes.auth import get_current_user
from app.core.config import (
    LLM_API_KEY,
    LLM_BASE_URL,
    LLM_MODEL,
    LLM_TIMEOUT_SECONDS,
)
from app.models.roles import UserRole
from app.models.user import User
from app.schemas.chat import ChatRequest, ChatResponse

router = APIRouter(prefix="/chat", tags=["AI chat"])
logger = logging.getLogger(__name__)
ALLOWED_ROLES = {UserRole.PATIENT, UserRole.DOCTOR}
SYSTEM_PROMPT = (
    "You are Carecell's health information assistant. Give clear, empathetic, general health information. "
    "Do not diagnose, prescribe, or claim to replace a qualified clinician. Encourage users to consult their "
    "healthcare professional for personal medical decisions. For potentially life-threatening symptoms, advise "
    "seeking emergency services immediately. Do not claim to have accessed medical records."
)


def _request_chat_completion(
    messages: list[dict[str, object]], *, base_url: str, api_key: str, model: str, provider: str
) -> str:
    print("Requesting chat completion from %s provider for model %s", provider, model)
    payload = json.dumps({"model": model, "messages": messages, "temperature": 0.4}).encode("utf-8")
    request = Request(
        f"{base_url}/chat/completions",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=LLM_TIMEOUT_SECONDS) as response:
            result = json.loads(response.read())
    except HTTPError as error:
        logger.warning("Configured %s provider returned HTTP %s for model %s", provider, error.code, model)
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


def _request_model(messages: list[dict[str, object]]) -> str:
    return _request_chat_completion(
        messages,
        base_url=LLM_BASE_URL,
        api_key=LLM_API_KEY,
        model=LLM_MODEL,
        provider="configured LLM",
    )


@router.post("", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    user: User = Depends(get_current_user),
) -> ChatResponse:
    if user.role not in ALLOWED_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Patient or doctor access is required.")
    if not LLM_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI chat is not configured. Set LLM_API_KEY in the backend environment.",
        )

    conversation: list[dict[str, object]] = []
    for message in payload.messages:
        content: str | list[dict[str, object]] = message.content
        if message.image:
            content = [
                {"type": "text", "text": message.content},
                {"type": "image_url", "image_url": {"url": message.image}},
            ]
        conversation.append({"role": message.role, "content": content})
    messages = [{"role": "system", "content": SYSTEM_PROMPT}, *conversation]
    answer = await asyncio.to_thread(_request_model, messages)
    return ChatResponse(message=answer)