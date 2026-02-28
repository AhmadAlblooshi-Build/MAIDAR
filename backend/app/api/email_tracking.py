"""
Email Tracking API - Track email opens and link clicks
"""

import logging
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Response, HTTPException, status
from fastapi.responses import Response as FastAPIResponse
from sqlalchemy.orm import Session
from fastapi import Depends

from app.config.database import get_db
from app.models.simulation import SimulationResult

router = APIRouter(tags=["Email Tracking"])
logger = logging.getLogger(__name__)

# 1x1 transparent GIF pixel
TRACKING_PIXEL = bytes([
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,
    0x01, 0x00, 0x80, 0x00, 0x00, 0xFF, 0xFF, 0xFF,
    0x00, 0x00, 0x00, 0x21, 0xF9, 0x04, 0x01, 0x00,
    0x00, 0x00, 0x00, 0x2C, 0x00, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
    0x01, 0x00, 0x3B
])


@router.get("/track/open/{tracking_id}")
async def track_email_open(tracking_id: str, db: Session = Depends(get_db)):
    """
    Track email open events via tracking pixel.

    When an email is opened, the tracking pixel is loaded,
    triggering this endpoint to record the open event.
    """
    try:
        # Find simulation result by tracking ID
        result = db.query(SimulationResult).filter(
            SimulationResult.id == UUID(tracking_id)
        ).first()

        if result:
            # Update opened timestamp if not already opened
            if not result.opened_at:
                result.opened_at = datetime.utcnow()
                result.status = "OPENED"
                db.commit()
                logger.info(f"Email opened: tracking_id={tracking_id}, employee_id={result.employee_id}")
            else:
                logger.debug(f"Email already opened: tracking_id={tracking_id}")

    except ValueError:
        # Invalid UUID format
        logger.warning(f"Invalid tracking ID format: {tracking_id}")
    except Exception as e:
        logger.error(f"Error tracking email open: {e}")

    # Always return tracking pixel (even if tracking fails)
    return Response(
        content=TRACKING_PIXEL,
        media_type="image/gif",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


@router.get("/track/click/{tracking_id}")
async def track_link_click(tracking_id: str, db: Session = Depends(get_db)):
    """
    Track link click events.

    When an employee clicks a phishing link, this endpoint records
    the click event and redirects to a warning page.
    """
    try:
        # Find simulation result by tracking ID
        result = db.query(SimulationResult).filter(
            SimulationResult.id == UUID(tracking_id)
        ).first()

        if result:
            # Update clicked timestamp
            if not result.clicked_at:
                result.clicked_at = datetime.utcnow()
                result.status = "CLICKED"

                # Also mark as opened if not already
                if not result.opened_at:
                    result.opened_at = datetime.utcnow()

                db.commit()
                logger.info(f"Link clicked: tracking_id={tracking_id}, employee_id={result.employee_id}")
            else:
                logger.debug(f"Link already clicked: tracking_id={tracking_id}")

        # Redirect to phishing awareness page
        awareness_url = f"{get_frontend_url()}/phishing-awareness?id={tracking_id}"
        return FastAPIResponse(
            status_code=status.HTTP_302_FOUND,
            headers={"Location": awareness_url}
        )

    except ValueError:
        # Invalid UUID format
        logger.warning(f"Invalid tracking ID format: {tracking_id}")
        return FastAPIResponse(
            status_code=status.HTTP_302_FOUND,
            headers={"Location": get_frontend_url()}
        )
    except Exception as e:
        logger.error(f"Error tracking link click: {e}")
        return FastAPIResponse(
            status_code=status.HTTP_302_FOUND,
            headers={"Location": get_frontend_url()}
        )


@router.post("/track/credential-submit/{tracking_id}")
async def track_credential_submit(
    tracking_id: str,
    credentials: dict,
    db: Session = Depends(get_db)
):
    """
    Track credential submission events.

    When an employee submits credentials on a fake phishing page,
    this endpoint records the submission (but NOT the actual credentials).
    """
    try:
        # Find simulation result by tracking ID
        result = db.query(SimulationResult).filter(
            SimulationResult.id == UUID(tracking_id)
        ).first()

        if result:
            # Update submitted timestamp
            if not result.submitted_at:
                result.submitted_at = datetime.utcnow()
                result.status = "SUBMITTED"

                # Also mark as opened and clicked if not already
                if not result.opened_at:
                    result.opened_at = datetime.utcnow()
                if not result.clicked_at:
                    result.clicked_at = datetime.utcnow()

                db.commit()
                logger.info(f"Credentials submitted: tracking_id={tracking_id}, employee_id={result.employee_id}")

            return {"success": True, "message": "Thank you for your submission"}

        else:
            logger.warning(f"Simulation result not found for tracking_id: {tracking_id}")
            return {"success": False, "message": "Invalid tracking ID"}

    except ValueError:
        logger.warning(f"Invalid tracking ID format: {tracking_id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid tracking ID"
        )
    except Exception as e:
        logger.error(f"Error tracking credential submit: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to track submission"
        )


def get_frontend_url() -> str:
    """Get frontend URL from environment."""
    import os
    return os.getenv("FRONTEND_URL", "http://localhost:3000")
