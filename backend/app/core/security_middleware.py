"""
Security headers middleware for enhanced security.

Implements OWASP security headers best practices.
"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from typing import Callable
from app.config.settings import settings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers to all responses.

    Headers implemented:
    - Content-Security-Policy (CSP)
    - X-Frame-Options
    - X-Content-Type-Options
    - Strict-Transport-Security (HSTS)
    - Referrer-Policy
    - Permissions-Policy
    - X-XSS-Protection (legacy browsers)
    """

    def __init__(
        self,
        app,
        csp: str = None,
        frame_options: str = "DENY",
        hsts_max_age: int = 31536000,
        hsts_include_subdomains: bool = True,
        hsts_preload: bool = True,
    ):
        """
        Initialize security headers middleware.

        Args:
            app: ASGI application
            csp: Content-Security-Policy directive (default: strict policy)
            frame_options: X-Frame-Options value (DENY or SAMEORIGIN)
            hsts_max_age: HSTS max-age in seconds (default: 1 year)
            hsts_include_subdomains: Include subdomains in HSTS
            hsts_preload: Enable HSTS preload
        """
        super().__init__(app)

        # Default CSP if not provided
        # Use strict CSP without unsafe-inline in production
        if settings.DEBUG:
            # Development: Allow unsafe-inline for easier development
            self.csp = csp or (
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
        else:
            # Production: Strict CSP without unsafe-inline
            self.csp = csp or (
                "default-src 'self'; "
                "script-src 'self' https://cdn.jsdelivr.net; "
                "style-src 'self' https://fonts.googleapis.com; "
                "img-src 'self' data: https:; "
                "font-src 'self' data: https://fonts.gstatic.com; "
                "connect-src 'self' https://api.anthropic.com; "
                "frame-ancestors 'none'; "
                "base-uri 'self'; "
                "form-action 'self'"
            )

        self.frame_options = frame_options

        # Build HSTS header
        hsts_parts = [f"max-age={hsts_max_age}"]
        if hsts_include_subdomains:
            hsts_parts.append("includeSubDomains")
        if hsts_preload:
            hsts_parts.append("preload")
        self.hsts = "; ".join(hsts_parts)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Add security headers to response."""
        response = await call_next(request)

        # Content Security Policy
        response.headers["Content-Security-Policy"] = self.csp

        # Prevent clickjacking
        response.headers["X-Frame-Options"] = self.frame_options

        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Force HTTPS (only in production, not in development/localhost)
        if not settings.DEBUG:
            response.headers["Strict-Transport-Security"] = self.hsts

        # Referrer policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions policy (restrict dangerous features)
        response.headers["Permissions-Policy"] = (
            "geolocation=(), "
            "microphone=(), "
            "camera=(), "
            "payment=(), "
            "usb=(), "
            "magnetometer=(), "
            "gyroscope=(), "
            "accelerometer=()"
        )

        # XSS Protection (legacy browsers)
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Remove server header to avoid version disclosure
        if "Server" in response.headers:
            del response.headers["Server"]

        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple in-memory rate limiting middleware.

    For production, use Redis-backed rate limiting.
    """

    def __init__(
        self,
        app,
        max_requests: int = 100,
        window_seconds: int = 60,
        exempt_paths: list = None
    ):
        """
        Initialize rate limit middleware.

        Args:
            app: ASGI application
            max_requests: Maximum requests per window
            window_seconds: Time window in seconds
            exempt_paths: List of paths to exempt from rate limiting
        """
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.exempt_paths = exempt_paths or [
            "/health",
            "/docs",
            "/openapi.json",
            "/redoc",
            "/readiness",  # Kubernetes readiness probe
            "/liveness",   # Kubernetes liveness probe
            "/metrics"     # Prometheus metrics scraping
        ]

        # In-memory store (use Redis in production)
        from collections import defaultdict
        import time
        self.requests = defaultdict(list)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Rate limit requests by IP address."""
        # Skip rate limiting for exempt paths
        if request.url.path in self.exempt_paths:
            return await call_next(request)

        # Get client IP
        client_ip = request.client.host

        # Clean up old requests
        import time
        current_time = time.time()
        self.requests[client_ip] = [
            req_time for req_time in self.requests[client_ip]
            if current_time - req_time < self.window_seconds
        ]

        # Check rate limit
        if len(self.requests[client_ip]) >= self.max_requests:
            from starlette.responses import JSONResponse
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Too Many Requests",
                    "detail": f"Rate limit exceeded. Max {self.max_requests} requests per {self.window_seconds} seconds."
                }
            )

        # Add current request
        self.requests[client_ip].append(current_time)

        return await call_next(request)
