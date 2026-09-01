"""Shared async Redis client (session/logout denylist, AI response caching)."""
import os

from redis.asyncio import Redis, from_url

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")

redis_client: Redis = from_url(REDIS_URL, decode_responses=True)
