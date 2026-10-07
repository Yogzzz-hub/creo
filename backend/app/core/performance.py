"""Request-local timings; never store SQL text, parameters or credentials."""

from contextvars import ContextVar
from dataclasses import dataclass


@dataclass
class RequestTimings:
    db_ms: float = 0.0
    db_queries: int = 0
    auth_cache_ms: float = 0.0


request_timings: ContextVar[RequestTimings | None] = ContextVar("request_timings", default=None)
