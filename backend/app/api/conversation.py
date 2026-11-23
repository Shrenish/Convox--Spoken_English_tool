"""Conversation API — start, speak, end, and read-back turns & autopsy."""

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..schemas import AutopsyOut, ConversationStartRequest, TurnResponse
from ..services.conversation_engine import conversation_engine
from ..services.evaluation_engine import get_autopsy
from ..services.users import get_or_create_default_user

router = APIRouter(prefix="/api/conversation", tags=["conversation"])


@router.post("/start", response_model=TurnResponse)
async def start_conversation(
    body: ConversationStartRequest,
    session: AsyncSession = Depends(get_session),
) -> TurnResponse:
    """Create a conversation and return the AI's opening line (with audio URL)."""
    user = await get_or_create_default_user(session)
    conv, opening, audio_url = await conversation_engine.start_conversation(
        session,
        user_id=user.id,
        scenario_key=body.scenario_key,
        mode=body.mode,
        request_id=body.request_id,
    )
    await session.commit()
    return TurnResponse(
        conversation_id=conv.id,
        sequence=0,
        ai_transcript=opening,
        ai_audio_url=audio_url,
    )


@router.post("/{conversation_id}/turn", response_model=TurnResponse)
async def process_turn(
    conversation_id: str,
    session: AsyncSession = Depends(get_session),
    audio: UploadFile | None = File(None, description="User audio (wav/ogg/webm/mp3)"),
    transcript: str | None = Form(None, description="Optional: skip STT, use text"),
    request_id: str | None = Form(None, description="Optional: idempotent request id"),
) -> TurnResponse:
    """One user turn. Audio is transcribed (Groq Whisper), the AI replies, the
    reply is synthesized (OpenAI TTS) and every turn is persisted."""
    audio_bytes = await audio.read() if audio is not None else None
    try:
        data = await conversation_engine.process_user_turn(
            session,
            conversation_id,
            request_id=request_id,
            audio_bytes=audio_bytes,
            audio_filename=audio.filename if audio else None,
            transcript_override=transcript,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    await session.commit()
    return TurnResponse(
        conversation_id=conversation_id,
        sequence=data["sequence"],
        user_transcript=data["user_transcript"],
        ai_transcript=data["ai_transcript"],
        ai_audio_url=data["ai_audio_path"],
        event=data["event"],
        conversation_complete=data["conversation_complete"],
        max_turns_reached=data["max_turns_reached"],
    )


@router.post("/{conversation_id}/end")
async def end_conversation(
    conversation_id: str,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Mark a conversation complete. Evaluation runs lazily on the autopsy read."""
    await conversation_engine.end_conversation(session, conversation_id)
    await session.commit()
    return {
        "conversation_id": conversation_id,
        "status": "completed",
        "message": "Conversation ended. Pull /api/conversation/{id}/autopsy for the analysis.",
    }


@router.get("/{conversation_id}/turns")
async def list_turns(
    conversation_id: str,
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    return await conversation_engine.list_turns(session, conversation_id)


@router.get("/{conversation_id}/autopsy", response_model=AutopsyOut)
async def conversation_autopsy(
    conversation_id: str,
    session: AsyncSession = Depends(get_session),
) -> AutopsyOut:
    """Full CORE autopsy: dimension scores, quoted evidence, event resolutions."""
    result = await get_autopsy(session, conversation_id)
    await session.commit()
    return result