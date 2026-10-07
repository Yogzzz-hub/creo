"""Request tracking middleware.

Extracts or generates X-Request-Id, binds it to the structlog contextvars
for structured log correlation, and echoes it on the HTTP response.
"""

import uuid
from time import perf_counter

import structlog
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response
from app.core.performance import RequestTimings, request_timings


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Middleware to bind and echo X-Request-Id header."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get("X-Request-Id") or str(uuid.uuid4())
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)

        started = perf_counter()
        timings = RequestTimings()
        timing_token = request_timings.set(timings)
        try:
            response = await call_next(request)
        finally:
            request_timings.reset(timing_token)
        duration_ms = (perf_counter() - started) * 1000
        response.headers["Server-Timing"] = (
            f'app;dur={duration_ms:.1f}, db;dur={timings.db_ms:.1f};desc="{timings.db_queries} queries", '
            f'auth-cache;dur={timings.auth_cache_ms:.1f}'
        )
        if duration_ms >= 1000:
            route = request.scope.get("route")
            structlog.get_logger(__name__).warning(
                "slow_api_request", method=request.method,
                path=getattr(route, "path", request.url.path),
                duration_ms=round(duration_ms, 1), status=response.status_code,
                db_ms=round(timings.db_ms, 1), db_queries=timings.db_queries,
                auth_cache_ms=round(timings.auth_cache_ms, 1),
            )
        response.headers["X-Request-Id"] = request_id
        return response
