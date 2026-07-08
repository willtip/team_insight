"""
Degreed API Service

Handles OAuth2 Client Credentials authentication and data fetching from
the Degreed LXP API v2 (https://developer.degreed.com).

Required OAuth scopes:
  users:read, user_skills:read, skill_ratings:read,
  skill_plans:read, required_learning:read, completions:read
"""
import time
import logging
from typing import Optional, Any
from dataclasses import dataclass, field

import httpx

logger = logging.getLogger(__name__)


@dataclass
class DegreedToken:
    access_token: str
    expires_at: float  # Unix timestamp

    def is_expired(self) -> bool:
        # Refresh 60 seconds before actual expiry
        return time.time() >= (self.expires_at - 60)


@dataclass
class DegreedConfig:
    client_id: str
    client_secret: str
    base_url: str = "https://api.degreed.com"
    auth_url: str = "https://degreed.com/oauth/token"
    # Scopes required for Team Insight reads
    scopes: str = (
        "users:read user_skills:read skill_ratings:read "
        "skill_plans:read required_learning:read completions:read"
    )
    timeout: float = 30.0


class DegreedService:
    """
    Async client for the Degreed API v2.

    Usage:
        config = DegreedConfig(client_id="...", client_secret="...")
        service = DegreedService(config)

        skills = await service.get_team_skills(user_ids=["u1", "u2"])
    """

    def __init__(self, config: DegreedConfig):
        self._config = config
        self._token: Optional[DegreedToken] = None

    # ------------------------------------------------------------------
    # Authentication
    # ------------------------------------------------------------------

    async def _get_token(self) -> str:
        """Return a valid bearer token, refreshing if necessary."""
        if self._token and not self._token.is_expired():
            return self._token.access_token

        async with httpx.AsyncClient(timeout=self._config.timeout) as client:
            response = await client.post(
                self._config.auth_url,
                data={
                    "grant_type": "client_credentials",
                    "client_id": self._config.client_id,
                    "client_secret": self._config.client_secret,
                    "scope": self._config.scopes,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )

        if response.status_code != 200:
            raise DegreedAuthError(
                f"Failed to obtain Degreed token: {response.status_code} {response.text}"
            )

        data = response.json()
        expires_in = data.get("expires_in", 5183999)  # default ~60 days
        self._token = DegreedToken(
            access_token=data["access_token"],
            expires_at=time.time() + expires_in,
        )
        logger.info("Degreed access token refreshed successfully.")
        return self._token.access_token

    async def _get(self, path: str, params: Optional[dict] = None) -> dict:
        """Make an authenticated GET request to the Degreed API."""
        token = await self._get_token()
        url = f"{self._config.base_url.rstrip('/')}{path}"

        async with httpx.AsyncClient(timeout=self._config.timeout) as client:
            response = await client.get(
                url,
                params=params,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/json",
                },
            )

        if response.status_code == 401:
            # Token may have been revoked — clear and raise
            self._token = None
            raise DegreedAuthError("Degreed token unauthorized. Re-authenticate.")

        if response.status_code == 429:
            raise DegreedRateLimitError("Degreed API rate limit exceeded.")

        if not response.is_success:
            raise DegreedAPIError(
                f"Degreed API error {response.status_code}: {response.text}"
            )

        return response.json()

    async def _get_paginated(self, path: str, params: Optional[dict] = None) -> list[dict]:
        """Fetch all pages from a paginated Degreed endpoint."""
        params = params or {}
        results: list[dict] = []

        while True:
            data = await self._get(path, params)
            items = data.get("data", [])
            results.extend(items)

            # Degreed uses cursor-based pagination via links.next
            links = data.get("links", {})
            next_url = links.get("next")
            if not next_url:
                break

            # Extract the cursor/page token from the next URL
            parsed = httpx.URL(next_url)
            params = dict(parsed.params)

        return results

    # ------------------------------------------------------------------
    # Connection Test
    # ------------------------------------------------------------------

    async def test_connection(self) -> dict:
        """Verify credentials by fetching a single user record."""
        try:
            data = await self._get("/api/v2/users", params={"limit": 1})
            return {"connected": True, "message": "Connection successful"}
        except DegreedAuthError as e:
            return {"connected": False, "message": str(e)}
        except Exception as e:
            return {"connected": False, "message": f"Connection failed: {e}"}

    # ------------------------------------------------------------------
    # Users
    # ------------------------------------------------------------------

    async def get_users(
        self,
        limit: int = 100,
        filter_email: Optional[str] = None,
    ) -> list[dict]:
        """Fetch organization users from Degreed."""
        params: dict[str, Any] = {"limit": limit}
        if filter_email:
            params["filter[email]"] = filter_email
        return await self._get_paginated("/api/v2/users", params)

    async def get_user_by_email(self, email: str) -> Optional[dict]:
        """Look up a single Degreed user by email address."""
        users = await self.get_users(filter_email=email)
        return users[0] if users else None

    # ------------------------------------------------------------------
    # User Skills
    # ------------------------------------------------------------------

    async def get_user_skills(self, user_id: str) -> list[dict]:
        """Get all skills for a specific Degreed user."""
        return await self._get_paginated(f"/api/v2/users/{user_id}/user-skills")

    async def get_all_user_skills(self, limit: int = 500) -> list[dict]:
        """Get all user-skill records across the organization."""
        return await self._get_paginated("/api/v2/user-skills", {"limit": limit})

    async def get_focus_skills(self, user_id: str) -> list[dict]:
        """
        Return focus (target) skills for a user.
        Focus skills are user-skills where the user has marked them as a focus area.
        """
        all_skills = await self.get_user_skills(user_id)
        return [s for s in all_skills if s.get("attributes", {}).get("focus", False)]

    # ------------------------------------------------------------------
    # Skill Ratings
    # ------------------------------------------------------------------

    async def get_skill_ratings(
        self,
        limit: int = 500,
        filter_skill_name: Optional[str] = None,
    ) -> list[dict]:
        """Get all skill ratings across the organization."""
        params: dict[str, Any] = {"limit": limit}
        if filter_skill_name:
            params["filter[skill_name]"] = filter_skill_name
        return await self._get_paginated("/api/v2/skill-ratings", params)

    async def get_user_skill_ratings(self, user_id: str) -> list[dict]:
        """Get skill ratings for a specific user (ratings breakdown)."""
        return await self._get_paginated(f"/api/v2/users/{user_id}/skill-ratings")

    async def get_skill_ratings_breakdown(self, skill_name: str) -> dict:
        """
        Return a breakdown of rating distribution for a specific skill.
        Groups ratings by level (Novice, Basic, Intermediate, Advanced, Expert).
        """
        ratings = await self.get_skill_ratings(filter_skill_name=skill_name)
        breakdown: dict[str, int] = {
            "Novice": 0,
            "Basic": 0,
            "Intermediate": 0,
            "Advanced": 0,
            "Expert": 0,
        }
        for r in ratings:
            level = r.get("attributes", {}).get("level-name", "")
            if level in breakdown:
                breakdown[level] += 1

        total = sum(breakdown.values())
        return {
            "skill_name": skill_name,
            "total_ratings": total,
            "breakdown": breakdown,
            "distribution": {
                k: round(v / total * 100, 1) if total else 0
                for k, v in breakdown.items()
            },
        }

    # ------------------------------------------------------------------
    # Skill Plans (Assignments)
    # ------------------------------------------------------------------

    async def get_skill_plans(self, limit: int = 100) -> list[dict]:
        """Get all skill plans (learning paths/assignments) in the organization."""
        return await self._get_paginated("/api/v2/skill-plans", {"limit": limit})

    async def get_user_skill_plans(self, user_id: str) -> list[dict]:
        """Get skill plans assigned to a specific user."""
        return await self._get_paginated(f"/api/v2/users/{user_id}/skill-plans")

    # ------------------------------------------------------------------
    # Required Learning / Assignments
    # ------------------------------------------------------------------

    async def get_required_learning(self, limit: int = 500) -> list[dict]:
        """Get all required learning assignments across the organization."""
        return await self._get_paginated("/api/v2/required-learning", {"limit": limit})

    async def get_user_required_learning(self, user_id: str) -> list[dict]:
        """Get required learning for a specific user."""
        return await self._get_paginated(f"/api/v2/users/{user_id}/required-learning")

    # ------------------------------------------------------------------
    # Completions
    # ------------------------------------------------------------------

    async def get_user_completions(
        self,
        user_id: str,
        limit: int = 100,
    ) -> list[dict]:
        """Get learning completions for a specific user."""
        return await self._get_paginated(
            f"/api/v2/users/{user_id}/completions", {"limit": limit}
        )

    # ------------------------------------------------------------------
    # Organization Skills
    # ------------------------------------------------------------------

    async def get_organization_skills(self, limit: int = 500) -> list[dict]:
        """Get all skills defined in the organization's skill taxonomy."""
        return await self._get_paginated("/api/v2/organization-skills", {"limit": limit})

    # ------------------------------------------------------------------
    # Aggregated Insights (computed)
    # ------------------------------------------------------------------

    async def get_team_skill_insights(self, user_ids: list[str]) -> dict:
        """
        Aggregate skill data across a list of Degreed user IDs to produce
        team-level skill insights.

        Returns:
            - top_skills: skills with highest average rating
            - gap_skills: skills with lowest average rating
            - total_unique_skills: count of distinct skills across the team
            - avg_rating_by_skill: mapping of skill name → average level
        """
        all_ratings: list[dict] = []

        for uid in user_ids:
            try:
                ratings = await self.get_user_skill_ratings(uid)
                all_ratings.extend(ratings)
            except Exception as e:
                logger.warning("Could not fetch ratings for user %s: %s", uid, e)

        # Level name → numeric value for averaging
        level_map = {
            "Novice": 1,
            "Basic": 2,
            "Intermediate": 3,
            "Advanced": 4,
            "Expert": 5,
        }

        skill_totals: dict[str, list[float]] = {}
        for r in all_ratings:
            attrs = r.get("attributes", {})
            skill_name = attrs.get("skill-name", "Unknown")
            level_name = attrs.get("level-name", "")
            numeric = level_map.get(level_name, 0)
            if numeric:
                skill_totals.setdefault(skill_name, []).append(numeric)

        avg_by_skill = {
            name: round(sum(vals) / len(vals), 2)
            for name, vals in skill_totals.items()
        }

        sorted_skills = sorted(avg_by_skill.items(), key=lambda x: x[1], reverse=True)

        return {
            "total_unique_skills": len(avg_by_skill),
            "team_member_count": len(user_ids),
            "avg_rating_by_skill": avg_by_skill,
            "top_skills": [
                {"name": k, "avg_rating": v} for k, v in sorted_skills[:10]
            ],
            "gap_skills": [
                {"name": k, "avg_rating": v} for k, v in sorted_skills[-10:]
            ],
        }


# ------------------------------------------------------------------
# Exceptions
# ------------------------------------------------------------------

class DegreedError(Exception):
    """Base Degreed exception."""


class DegreedAuthError(DegreedError):
    """Authentication / authorization failure."""


class DegreedRateLimitError(DegreedError):
    """API rate limit exceeded."""


class DegreedAPIError(DegreedError):
    """Generic API error response."""


# ------------------------------------------------------------------
# Factory — builds service from env / config dict
# ------------------------------------------------------------------

def make_degreed_service(
    client_id: str,
    client_secret: str,
    base_url: str = "https://api.degreed.com",
    auth_url: str = "https://degreed.com/oauth/token",
) -> DegreedService:
    config = DegreedConfig(
        client_id=client_id,
        client_secret=client_secret,
        base_url=base_url,
        auth_url=auth_url,
    )
    return DegreedService(config)
