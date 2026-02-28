"""
Security middleware for MAIDAR - Headers, CSRF, Rate Limiting
"""

import time
import hashlib
from typing import Callable
from collections import defaultdict
from datetime import datetime, timedelta

from fastapi import Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)

        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

        # Content Security Policy
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self'; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
        response.headers["Content-Security-Policy"] = csp

        # Remove server header
        if "server" in response.headers:
            del response.headers["server"]

        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware.

    Limits requests per IP address to prevent abuse.
    """

    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests = defaultdict(list)
        self.blocked_ips = {}

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Get client IP
        client_ip = request.client.host

        # Check if IP is blocked
        if client_ip in self.blocked_ips:
            blocked_until = self.blocked_ips[client_ip]
            if datetime.utcnow() < blocked_until:
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "detail": "Too many requests. Please try again later.",
                        "retry_after": int((blocked_until - datetime.utcnow()).total_seconds())
                    }
                )
            else:
                # Unblock IP
                del self.blocked_ips[client_ip]

        # Clean up old requests
        current_time = time.time()
        self.requests[client_ip] = [
            req_time for req_time in self.requests[client_ip]
            if current_time - req_time < 60
        ]

        # Check rate limit
        if len(self.requests[client_ip]) >= self.requests_per_minute:
            # Block IP for 5 minutes
            self.blocked_ips[client_ip] = datetime.utcnow() + timedelta(minutes=5)

            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": f"Rate limit exceeded. Maximum {self.requests_per_minute} requests per minute.",
                    "retry_after": 300
                }
            )

        # Add current request
        self.requests[client_ip].append(current_time)

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(
            self.requests_per_minute - len(self.requests[client_ip])
        )

        return response


class CSRFProtectionMiddleware(BaseHTTPMiddleware):
    """
    CSRF protection middleware.

    Validates CSRF tokens for state-changing operations.
    """

    def __init__(self, app, secret_key: str):
        super().__init__(app)
        self.secret_key = secret_key
        self.safe_methods = ["GET", "HEAD", "OPTIONS"]

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip CSRF for safe methods
        if request.method in self.safe_methods:
            return await call_next(request)

        # Skip CSRF for API endpoints (use JWT auth instead)
        if request.url.path.startswith("/api/"):
            return await call_next(request)

        # Validate CSRF token
        csrf_token = request.headers.get("X-CSRF-Token")
        if not csrf_token:
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": "CSRF token missing"}
            )

        # Verify token
        if not self._verify_csrf_token(csrf_token):
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": "Invalid CSRF token"}
            )

        return await call_next(request)

    def _verify_csrf_token(self, token: str) -> bool:
        """Verify CSRF token."""
        # Simple implementation - in production, use cryptographic signing
        try:
            expected = hashlib.sha256(f"{self.secret_key}:csrf".encode()).hexdigest()
            return token == expected
        except:
            return False


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log all requests for security monitoring."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        import logging

        logger = logging.getLogger("security")

        # Log request
        client_ip = request.client.host
        method = request.method
        path = request.url.path

        start_time = time.time()

        try:
            response = await call_next(request)
            process_time = time.time() - start_time

            # Log successful request
            logger.info(
                f"{client_ip} - {method} {path} - {response.status_code} - {process_time:.3f}s"
            )

            # Add processing time header
            response.headers["X-Process-Time"] = str(process_time)

            return response

        except Exception as e:
            process_time = time.time() - start_time

            # Log failed request
            logger.error(
                f"{client_ip} - {method} {path} - ERROR - {process_time:.3f}s - {str(e)}"
            )

            raise


def setup_security_middleware(app, secret_key: str, rate_limit: int = 60):
    """Set up all security middleware."""
    # Order matters - add from outermost to innermost
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(RateLimitMiddleware, requests_per_minute=rate_limit)
    app.add_middleware(CSRFProtectionMiddleware, secret_key=secret_key)
    app.add_middleware(SecurityHeadersMiddleware)
