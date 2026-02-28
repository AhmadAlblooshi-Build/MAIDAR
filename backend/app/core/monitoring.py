"""
Monitoring and observability setup with Sentry.

Provides error tracking, performance monitoring, and alerting.
"""

import logging
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.logging import LoggingIntegration

from app.config.settings import settings

logger = logging.getLogger(__name__)


def init_monitoring():
    """
    Initialize Sentry monitoring.

    Should be called at application startup.
    """
    if not settings.SENTRY_DSN:
        logger.warning("SENTRY_DSN not configured. Monitoring disabled.")
        return

    # Determine environment
    environment = "production" if not settings.DEBUG else "development"

    # Configure logging integration
    logging_integration = LoggingIntegration(
        level=logging.INFO,  # Capture info and above as breadcrumbs
        event_level=logging.ERROR  # Send errors as events
    )

    # Initialize Sentry
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=environment,
        release=f"maidar@{settings.APP_VERSION}",

        # Integrations
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            SqlalchemyIntegration(),
            RedisIntegration(),
            CeleryIntegration(),
            logging_integration,
        ],

        # Performance Monitoring
        traces_sample_rate=1.0 if settings.DEBUG else 0.1,  # 100% in dev, 10% in prod
        profiles_sample_rate=1.0 if settings.DEBUG else 0.1,

        # Error Sampling
        sample_rate=1.0,  # Capture 100% of errors

        # Privacy Settings
        send_default_pii=False,  # Don't send PII by default

        # Additional Options
        attach_stacktrace=True,
        max_breadcrumbs=50,

        # Before Send Hook (filter sensitive data)
        before_send=before_send_hook,

        # Before Breadcrumb Hook
        before_breadcrumb=before_breadcrumb_hook,
    )

    logger.info(f"Sentry monitoring initialized for {environment} environment")


def before_send_hook(event, hint):
    """
    Filter sensitive data before sending to Sentry.

    Args:
        event: Sentry event data
        hint: Additional context

    Returns:
        Modified event or None to discard
    """
    # Filter out sensitive headers
    if 'request' in event:
        headers = event['request'].get('headers', {})
        sensitive_headers = ['Authorization', 'Cookie', 'X-Api-Key']

        for header in sensitive_headers:
            if header in headers:
                headers[header] = '[Filtered]'

    # Filter sensitive query params
    if 'request' in event and 'query_string' in event['request']:
        query = event['request']['query_string']
        if 'password' in query or 'token' in query or 'secret' in query:
            event['request']['query_string'] = '[Filtered]'

    # Filter sensitive form data
    if 'request' in event and 'data' in event['request']:
        data = event['request']['data']
        if isinstance(data, dict):
            sensitive_fields = ['password', 'token', 'secret', 'api_key', 'credit_card']
            for field in sensitive_fields:
                if field in data:
                    data[field] = '[Filtered]'

    return event


def before_breadcrumb_hook(crumb, hint):
    """
    Filter sensitive data from breadcrumbs.

    Args:
        crumb: Breadcrumb data
        hint: Additional context

    Returns:
        Modified breadcrumb or None to discard
    """
    # Filter SQL queries with sensitive data
    if crumb.get('category') == 'query':
        message = crumb.get('message', '')
        if 'password' in message.lower() or 'secret' in message.lower():
            crumb['message'] = '[Filtered SQL Query]'

    return crumb


def capture_exception(error: Exception, **kwargs):
    """
    Capture exception and send to Sentry.

    Args:
        error: Exception to capture
        **kwargs: Additional context (user, tags, extra)
    """
    with sentry_sdk.push_scope() as scope:
        # Add user context if provided
        if 'user' in kwargs:
            user_data = kwargs.pop('user')
            scope.set_user(user_data)

        # Add tags if provided
        if 'tags' in kwargs:
            for key, value in kwargs.pop('tags').items():
                scope.set_tag(key, value)

        # Add extra context
        for key, value in kwargs.items():
            scope.set_extra(key, value)

        # Capture exception
        sentry_sdk.capture_exception(error)


def capture_message(message: str, level: str = "info", **kwargs):
    """
    Capture message and send to Sentry.

    Args:
        message: Message to capture
        level: Severity level (debug, info, warning, error, fatal)
        **kwargs: Additional context
    """
    with sentry_sdk.push_scope() as scope:
        # Add context
        for key, value in kwargs.items():
            scope.set_extra(key, value)

        # Capture message
        sentry_sdk.capture_message(message, level=level)


def set_user_context(user_id: str, email: str = None, username: str = None):
    """
    Set user context for error tracking.

    Args:
        user_id: User UUID
        email: User email (optional)
        username: Username (optional)
    """
    sentry_sdk.set_user({
        "id": user_id,
        "email": email,
        "username": username
    })


def set_transaction_name(name: str):
    """
    Set transaction name for performance monitoring.

    Args:
        name: Transaction name (e.g., "POST /api/v1/simulations")
    """
    scope = sentry_sdk.get_current_scope()
    if scope.transaction:
        scope.transaction.name = name


def add_breadcrumb(message: str, category: str = "custom", level: str = "info", **data):
    """
    Add breadcrumb for debugging context.

    Args:
        message: Breadcrumb message
        category: Category (http, db, navigation, etc.)
        level: Severity level
        **data: Additional data
    """
    sentry_sdk.add_breadcrumb({
        "message": message,
        "category": category,
        "level": level,
        "data": data
    })
