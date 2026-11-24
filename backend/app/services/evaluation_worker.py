"""Evaluation worker for durable background processing (Plan §4.3, Phase 6)."""

import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import SessionLocal
from ..models.evaluation_job import EvaluationJob
from .evaluation_engine import evaluate_conversation
from .learner_model import apply_evaluation

logger = logging.getLogger(__name__)


class EvaluationWorker:
    """Single-process local background worker to process durable evaluation jobs."""

    def __init__(self, poll_interval_sec: float = 2.0):
        self.poll_interval_sec = poll_interval_sec
        self._running = False
        self._task: asyncio.Task | None = None

    async def start(self) -> None:
        self._running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info("EvaluationWorker started.")

    async def stop(self) -> None:
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("EvaluationWorker stopped.")

    async def recover_stale_jobs(self) -> None:
        """On app start, recover jobs stuck in 'running' back to 'pending'."""
        async with SessionLocal() as session:
            stale_jobs = (
                await session.scalars(
                    select(EvaluationJob).where(EvaluationJob.status == "running")
                )
            ).all()
            for job in stale_jobs:
                job.status = "pending"
            await session.commit()

    async def process_next_job(self) -> bool:
        """Claims and runs the next pending evaluation job."""
        async with SessionLocal() as session:
            job = await session.scalar(
                select(EvaluationJob)
                .where(EvaluationJob.status == "pending")
                .order_by(EvaluationJob.created_at)
                .limit(1)
            )
            if not job:
                return False

            job.status = "running"
            job.started_at = datetime.now(timezone.utc)
            job.attempt_count += 1
            await session.commit()

            job_id = job.id
            conversation_id = job.conversation_id

        # Process outside of the claim transaction
        try:
            async with SessionLocal() as run_session:
                await evaluate_conversation(run_session, conversation_id)
                await apply_evaluation(run_session, conversation_id)
                await run_session.commit()

            async with SessionLocal() as finish_session:
                current_job = await finish_session.get(EvaluationJob, job_id)
                if current_job:
                    current_job.status = "completed"
                    current_job.finished_at = datetime.now(timezone.utc)
                    await finish_session.commit()
            return True

        except Exception as exc:
            logger.exception(f"Error processing evaluation job {job_id}: {exc}")
            async with SessionLocal() as fail_session:
                current_job = await fail_session.get(EvaluationJob, job_id)
                if current_job:
                    if current_job.attempt_count >= current_job.max_attempts:
                        current_job.status = "failed"
                    else:
                        current_job.status = "pending"  # Retryable
                    current_job.error_message = str(exc)[:500]
                    await fail_session.commit()
            return False

    async def _run_loop(self) -> None:
        await self.recover_stale_jobs()
        while self._running:
            try:
                processed = await self.process_next_job()
                if not processed:
                    await asyncio.sleep(self.poll_interval_sec)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Unexpected error in evaluation worker: {e}")
                await asyncio.sleep(self.poll_interval_sec)


evaluation_worker = EvaluationWorker()
