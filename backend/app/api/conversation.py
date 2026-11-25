"""Conversation API — start, speak, end, and read-back turns & autopsy."""

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..models.user import User
from ..schemas import AutopsyOut, ConversationStartRequest, TurnResponse
from ..services.conversation_engine import conversation_engine
from ..services.evaluation_engine import get_autopsy
from ..services.auth_deps import get_current_user

router = APIRouter(prefix="/api/conversation", tags=["conversation"])


async def _verify_owner(session: AsyncSession, conversation_id: str, user_id: str) -> None:
    from ..models.conversation import Conversation
    from ..services.users import DEFAULT_USER_ID

    conv = await session.get(Conversation, conversation_id)
    if conv and conv.user_id not in (user_id, DEFAULT_USER_ID):
        raise HTTPException(status_code=403, detail="Forbidden: you do not own this conversation")


@router.post("/start", response_model=TurnResponse)
async def start_conversation(
    body: ConversationStartRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> TurnResponse:
    """Create a conversation and return the AI's opening line (with audio URL)."""
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
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    audio: UploadFile | None = File(None, description="User audio (wav/ogg/webm/mp3)"),
    transcript: str | None = Form(None, description="Optional: skip STT, use text"),
    request_id: str | None = Form(None, description="Optional: idempotent request id"),
) -> TurnResponse:
    """One user turn. Audio is transcribed (Groq Whisper), the AI replies, the
    reply is synthesized (OpenAI TTS) and every turn is persisted."""
    await _verify_owner(session, conversation_id, user.id)
    from ..config import settings
    from ..utils.audio import is_allowed_audio

    audio_bytes = None
    if audio is not None:
        if audio.filename and not is_allowed_audio(audio.filename):
            raise HTTPException(status_code=400, detail=f"Unsupported audio format: {audio.filename}")
        
        # Stream-based bounded read: reject files exceeding MAX_AUDIO_BYTES without unbounded buffering
        chunks = []
        total_size = 0
        while chunk := await audio.read(1024 * 64):  # 64 KB chunks
            total_size += len(chunk)
            if total_size > settings.MAX_AUDIO_BYTES:
                raise HTTPException(
                    status_code=413,
                    detail=f"Audio file exceeds maximum size limit of {settings.MAX_AUDIO_BYTES // (1024*1024)}MB",
                )
            chunks.append(chunk)
        audio_bytes = b"".join(chunks)

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
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Mark a conversation complete. Evaluation runs lazily on the autopsy read."""
    await _verify_owner(session, conversation_id, user.id)
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
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    await _verify_owner(session, conversation_id, user.id)
    return await conversation_engine.list_turns(session, conversation_id)


@router.get("/{conversation_id}/evaluation-status")
async def get_evaluation_status(
    conversation_id: str,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Return status of the durable background evaluation job."""
    from sqlalchemy import select
    from ..models.evaluation_job import EvaluationJob

    job = await session.scalar(
        select(EvaluationJob).where(EvaluationJob.conversation_id == conversation_id)
    )
    if not job:
        return {"conversation_id": conversation_id, "status": "none"}
    return {
        "conversation_id": conversation_id,
        "job_id": job.id,
        "status": job.status,
        "attempt_count": job.attempt_count,
        "error_message": job.error_message,
    }


@router.get("/{conversation_id}/autopsy", response_model=AutopsyOut)
async def conversation_autopsy(
    conversation_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> AutopsyOut:
    """Full CORE autopsy: dimension scores, quoted evidence, event resolutions."""
    await _verify_owner(session, conversation_id, user.id)
    result = await get_autopsy(session, conversation_id)
    await session.commit()
    return result