"""
Degreed Integration Router

Exposes endpoints for querying Degreed LXP data:
  - /status                           — connection health
  - /team/skills                      — all user skills across team
  - /team/skill-ratings               — all skill ratings
  - /team/focus-skills                — skills users have marked as focus
  - /team/assignments                 — required learning / skill plan assignments
  - /team/insights                    — aggregated team skill insights
  - /users/{user_id}/skill-ratings    — per-user skill ratings breakdown
  - /skills/{skill_name}/breakdown    — rating distribution for a skill
  - /sync                             — trigger a full sync
"""
import os
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel

from app.services.degreed_service import (
    DegreedService,
    DegreedConfig,
    DegreedAuthError,
    DegreedRateLimitError,
    DegreedAPIError,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def _get_service_from_env() -> Optional[DegreedService]:
    """
    Build a DegreedService from environment variables.
    Returns None if credentials are not configured.
    """
    client_id = os.getenv("DEGREED_CLIENT_ID", "").strip()
    client_secret = os.getenv("DEGREED_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        return None

    config = DegreedConfig(
        client_id=client_id,
        client_secret=client_secret,
        base_url=os.getenv("DEGREED_BASE_URL", "https://api.degreed.com"),
        auth_url=os.getenv("DEGREED_AUTH_URL", "https://degreed.com/oauth/token"),
    )
    return DegreedService(config)


def _get_service_from_body(client_id: str, client_secret: str, base_url: str, auth_url: str) -> DegreedService:
    """Build a DegreedService from request-supplied credentials."""
    config = DegreedConfig(
        client_id=client_id,
        client_secret=client_secret,
        base_url=base_url,
        auth_url=auth_url,
    )
    return DegreedService(config)


def _require_service() -> DegreedService:
    svc = _get_service_from_env()
    if not svc:
        raise HTTPException(
            status_code=400,
            detail=(
                "Degreed credentials not configured. "
                "Set DEGREED_CLIENT_ID and DEGREED_CLIENT_SECRET environment variables, "
                "or configure them in Admin → Integrations → Degreed."
            ),
        )
    return svc


def _handle_degreed_error(e: Exception) -> None:
    if isinstance(e, DegreedAuthError):
        raise HTTPException(status_code=401, detail=str(e))
    if isinstance(e, DegreedRateLimitError):
        raise HTTPException(status_code=429, detail=str(e))
    if isinstance(e, DegreedAPIError):
        raise HTTPException(status_code=502, detail=str(e))
    raise HTTPException(status_code=500, detail=f"Unexpected Degreed error: {e}")


# ------------------------------------------------------------------
# Request / Response models
# ------------------------------------------------------------------

class DegreedCredentials(BaseModel):
    client_id: str
    client_secret: str
    base_url: str = "https://api.degreed.com"
    auth_url: str = "https://degreed.com/oauth/token"


class UserIdList(BaseModel):
    user_ids: list[str]


# ------------------------------------------------------------------
# Status / Connection
# ------------------------------------------------------------------

@router.get("/status")
async def get_degreed_status():
    """
    Check whether Degreed credentials are configured and the connection is live.
    """
    svc = _get_service_from_env()
    if not svc:
        return {
            "configured": False,
            "connected": False,
            "message": "Degreed credentials not configured.",
        }

    result = await svc.test_connection()
    return {"configured": True, **result}


@router.post("/test-connection")
async def test_degreed_connection(credentials: DegreedCredentials):
    """
    Test a set of Degreed credentials supplied in the request body.
    Used by the Admin UI integration config modal.
    """
    svc = _get_service_from_body(
        credentials.client_id,
        credentials.client_secret,
        credentials.base_url,
        credentials.auth_url,
    )
    result = await svc.test_connection()
    return result


# ------------------------------------------------------------------
# Team-level endpoints
# ------------------------------------------------------------------

@router.get("/team/skills")
async def get_team_skills(
    limit: int = Query(default=500, le=1000, description="Max records to return"),
):
    """
    Retrieve all user-skill records for the organization from Degreed.
    Returns raw Degreed API data for all users' skills.
    """
    svc = _require_service()
    try:
        skills = await svc.get_all_user_skills(limit=limit)
        return {
            "count": len(skills),
            "data": skills,
            "source": "degreed",
        }
    except Exception as e:
        _handle_degreed_error(e)


@router.get("/team/skill-ratings")
async def get_team_skill_ratings(
    limit: int = Query(default=500, le=1000),
    skill_name: Optional[str] = Query(default=None, description="Filter by skill name"),
):
    """
    Retrieve all skill ratings across the organization from Degreed.
    Optionally filter by a specific skill name.
    """
    svc = _require_service()
    try:
        ratings = await svc.get_skill_ratings(limit=limit, filter_skill_name=skill_name)
        return {
            "count": len(ratings),
            "data": ratings,
            "source": "degreed",
        }
    except Exception as e:
        _handle_degreed_error(e)


@router.get("/team/focus-skills")
async def get_team_focus_skills(user_id: str = Query(..., description="Degreed user ID")):
    """
    Get skills a specific user has marked as focus/target skills in Degreed.
    """
    svc = _require_service()
    try:
        focus = await svc.get_focus_skills(user_id)
        return {
            "user_id": user_id,
            "count": len(focus),
            "data": focus,
            "source": "degreed",
        }
    except Exception as e:
        _handle_degreed_error(e)


@router.get("/team/assignments")
async def get_team_assignments(
    limit: int = Query(default=500, le=1000),
):
    """
    Retrieve all required learning / assignments from Degreed.
    Includes both skill plans and required learning records.
    """
    svc = _require_service()
    try:
        required = await svc.get_required_learning(limit=limit)
        plans = await svc.get_skill_plans(limit=limit)
        return {
            "required_learning_count": len(required),
            "skill_plans_count": len(plans),
            "required_learning": required,
            "skill_plans": plans,
            "source": "degreed",
        }
    except Exception as e:
        _handle_degreed_error(e)


@router.post("/team/insights")
async def get_team_skill_insights(body: UserIdList):
    """
    Compute aggregated skill insights across a list of Degreed user IDs.

    Body:
        user_ids: List of Degreed user ID strings

    Returns top skills, gap skills, and average rating per skill.
    """
    if not body.user_ids:
        raise HTTPException(status_code=400, detail="user_ids must not be empty.")
    if len(body.user_ids) > 200:
        raise HTTPException(status_code=400, detail="Maximum 200 user IDs per request.")

    svc = _require_service()
    try:
        insights = await svc.get_team_skill_insights(body.user_ids)
        return {"source": "degreed", **insights}
    except Exception as e:
        _handle_degreed_error(e)


# ------------------------------------------------------------------
# Per-user endpoints
# ------------------------------------------------------------------

@router.get("/users/{user_id}/skills")
async def get_user_skills(user_id: str):
    """Get all skills for a specific Degreed user."""
    svc = _require_service()
    try:
        skills = await svc.get_user_skills(user_id)
        return {"user_id": user_id, "count": len(skills), "data": skills}
    except Exception as e:
        _handle_degreed_error(e)


@router.get("/users/{user_id}/skill-ratings")
async def get_user_skill_ratings(user_id: str):
    """
    Get detailed skill ratings breakdown for a specific Degreed user.
    Useful for individual skill proficiency views.
    """
    svc = _require_service()
    try:
        ratings = await svc.get_user_skill_ratings(user_id)

        # Group by skill for easier frontend consumption
        by_skill: dict[str, dict] = {}
        for r in ratings:
            attrs = r.get("attributes", {})
            name = attrs.get("skill-name", "Unknown")
            by_skill[name] = {
                "skill_name": name,
                "level": attrs.get("level-name", ""),
                "level_value": attrs.get("level-value", 0),
                "rating_date": attrs.get("date-updated", ""),
                "rating_id": r.get("id", ""),
            }

        return {
            "user_id": user_id,
            "total_skills_rated": len(by_skill),
            "ratings": list(by_skill.values()),
            "source": "degreed",
        }
    except Exception as e:
        _handle_degreed_error(e)


@router.get("/users/{user_id}/assignments")
async def get_user_assignments(user_id: str):
    """Get required learning and skill plan assignments for a specific user."""
    svc = _require_service()
    try:
        required = await svc.get_user_required_learning(user_id)
        plans = await svc.get_user_skill_plans(user_id)
        return {
            "user_id": user_id,
            "required_learning": required,
            "skill_plans": plans,
            "source": "degreed",
        }
    except Exception as e:
        _handle_degreed_error(e)


@router.get("/users/{user_id}/completions")
async def get_user_completions(
    user_id: str,
    limit: int = Query(default=100, le=500),
):
    """Get learning completions for a specific Degreed user."""
    svc = _require_service()
    try:
        completions = await svc.get_user_completions(user_id, limit=limit)
        return {
            "user_id": user_id,
            "count": len(completions),
            "data": completions,
            "source": "degreed",
        }
    except Exception as e:
        _handle_degreed_error(e)


# ------------------------------------------------------------------
# Skill-level endpoints
# ------------------------------------------------------------------

@router.get("/skills/{skill_name}/breakdown")
async def get_skill_ratings_breakdown(skill_name: str):
    """
    Get the rating level distribution for a specific skill across the organization.
    Returns counts and percentages for each rating level (Novice → Expert).
    """
    svc = _require_service()
    try:
        breakdown = await svc.get_skill_ratings_breakdown(skill_name)
        return {"source": "degreed", **breakdown}
    except Exception as e:
        _handle_degreed_error(e)


@router.get("/organization-skills")
async def get_organization_skills(
    limit: int = Query(default=500, le=1000),
):
    """Retrieve the full skill taxonomy defined in Degreed."""
    svc = _require_service()
    try:
        skills = await svc.get_organization_skills(limit=limit)
        return {"count": len(skills), "data": skills, "source": "degreed"}
    except Exception as e:
        _handle_degreed_error(e)


# ------------------------------------------------------------------
# Sync
# ------------------------------------------------------------------

@router.post("/sync")
async def trigger_sync():
    """
    Trigger a full Degreed data sync.
    Fetches users, skills, ratings, and assignments and returns summary counts.
    In production this would write to the database; here it returns a preview.
    """
    svc = _require_service()
    try:
        users = await svc.get_users(limit=200)
        org_skills = await svc.get_organization_skills(limit=500)
        ratings = await svc.get_skill_ratings(limit=1000)
        assignments = await svc.get_required_learning(limit=500)

        return {
            "status": "ok",
            "synced": {
                "users": len(users),
                "organization_skills": len(org_skills),
                "skill_ratings": len(ratings),
                "assignments": len(assignments),
            },
            "source": "degreed",
        }
    except Exception as e:
        _handle_degreed_error(e)
