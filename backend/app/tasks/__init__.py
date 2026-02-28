"""
Background tasks package for MAIDAR.

Tasks are executed asynchronously by Celery workers.
"""

from app.core.celery_app import celery_app

__all__ = ["celery_app"]
