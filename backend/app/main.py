"""
Team Insight AI - FastAPI Backend
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.core.redis import redis_client
from app.db.session import engine
from app.routers import employees, goals, skills, projects, insights, notes, reports, auth, one_on_ones


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()
    await redis_client.aclose()


app = FastAPI(
    title="Team Insight AI API",
    description="Enterprise performance management platform for engineering teams",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://teaminsight.company.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(employees.router, prefix="/api/v1/employees", tags=["Employees"])
app.include_router(goals.router, prefix="/api/v1/goals", tags=["Goals"])
app.include_router(skills.router, prefix="/api/v1/skills", tags=["Skills"])
app.include_router(projects.router, prefix="/api/v1/projects", tags=["Projects"])
app.include_router(insights.router, prefix="/api/v1/insights", tags=["AI Insights"])
app.include_router(notes.router, prefix="/api/v1/notes", tags=["Director Notes"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])
app.include_router(one_on_ones.router, prefix="/api/v1/one-on-ones", tags=["One-on-Ones"])


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}


@app.get("/api/v1/team/metrics")
async def get_team_metrics():
    """Get aggregated team performance metrics."""
    return {
        "total_members": 10,
        "team_health_score": 79,
        "goal_completion_rate": 68,
        "skills_growth_score": 82,
        "promotion_ready_count": 2,
        "needs_coaching_count": 2,
        "active_projects": 12,
        "completed_trainings": 18,
    }
