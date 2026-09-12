"""Service-layer exceptions mapped to HTTP errors by the API layer."""


class ServiceError(Exception):
    """Base class for all service errors. Carries a stable code + user message."""

    def __init__(self, message: str, code: str = "service_error", status: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status = status


class LLMNotConfigured(ServiceError):
    def __init__(self, message: str) -> None:
        super().__init__(message, code="llm_not_configured", status=503)


class LLMResponseError(ServiceError):
    def __init__(self, message: str) -> None:
        super().__init__(message, code="llm_response_error", status=502)


class STTNotConfigured(ServiceError):
    def __init__(self, message: str) -> None:
        super().__init__(message, code="stt_not_configured", status=503)


class STTError(ServiceError):
    def __init__(self, message: str, status: int = 502) -> None:
        super().__init__(message, code="stt_error", status=status)


class TTSNotConfigured(ServiceError):
    def __init__(self, message: str) -> None:
        super().__init__(message, code="tts_not_configured", status=503)


class TTSError(ServiceError):
    def __init__(self, message: str, status: int = 502) -> None:
        super().__init__(message, code="tts_error", status=status)


class ScenarioNotFound(ServiceError):
    def __init__(self, scenario_key: str) -> None:
        super().__init__(
            f"Scenario '{scenario_key}' not found", code="scenario_not_found", status=404
        )


class ConversationNotFound(ServiceError):
    def __init__(self, conversation_id: str) -> None:
        super().__init__(
            f"Conversation '{conversation_id}' not found",
            code="conversation_not_found",
            status=404,
        )


class ConversationInactive(ServiceError):
    def __init__(self, conversation_id: str) -> None:
        super().__init__(
            f"Conversation '{conversation_id}' is not active",
            code="conversation_inactive",
            status=409,
        )


class JourneyNotFound(ServiceError):
    def __init__(self, journey_id: str) -> None:
        super().__init__(f"Journey '{journey_id}' not found", code="journey_not_found", status=404)


class StageNotFound(ServiceError):
    def __init__(self, stage_key: str) -> None:
        super().__init__(f"Stage '{stage_key}' not found", code="stage_not_found", status=404)


class StageNotActive(ServiceError):
    def __init__(self, stage_key: str) -> None:
        super().__init__(f"Stage '{stage_key}' is not active yet", code="stage_not_active", status=409)


class EvaluationError(ServiceError):
    def __init__(self, message: str) -> None:
        super().__init__(message, code="evaluation_error", status=502)