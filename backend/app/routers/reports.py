"""Report data aggregation endpoints.

Note: PDF/Excel/PowerPoint rendering stays client-side (lib/skill-workbook.ts already
handles Excel export). These endpoints aggregate the underlying data as JSON.
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, HTTPException

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.models import Employee, User
from app.routers._employee_helpers import DETAIL_RELATIONSHIPS, to_employee_detail
from app.schemas.schemas import ReportRequest

router = APIRouter()

REPORT_TEMPLATES = [
    {"type": "team-health", "title": "Team Health", "sections": ["overview", "goal_completion", "risks"]},
    {"type": "goal-status", "title": "Goal Status", "sections": ["by_status", "by_employee", "at_risk"]},
    {
        "type": "promotion-pipeline",
        "title": "Promotion Pipeline",
        "sections": ["ready_now", "ready_6mo", "ready_12mo", "development_needed"],
    },
    {"type": "skills-readiness", "title": "Skills Readiness", "sections": ["coverage", "gaps", "bus_factor"]},
    {"type": "coaching-summary", "title": "Coaching Summary", "sections": ["needs_coaching", "recent_notes"]},
    {
        "type": "succession-planning",
        "title": "Succession Planning",
        "sections": ["high_potential", "depth_by_role"],
    },
]


@router.post("/generate")
async def generate_report(
    request: ReportRequest, db: AsyncSession = Depends(get_db), _user: User = Depends(get_current_user)
):
    """
    Aggregate the data backing a performance report.
    Supported types: team-health, goal-status, promotion-pipeline, skills-readiness,
                    coaching-summary, succession-planning.
    """
    if request.type not in {t["type"] for t in REPORT_TEMPLATES}:
        raise HTTPException(400, f"Unknown report type: {request.type}")

    query = select(Employee).options(*DETAIL_RELATIONSHIPS)
    if request.employee_ids:
        query = query.where(Employee.id.in_(request.employee_ids))
    result = await db.execute(query)
    employees = result.scalars().all()

    data = [to_employee_detail(e).model_dump(mode="json") for e in employees]

    return {
        "type": request.type,
        "date_range": {"start": request.date_range_start, "end": request.date_range_end},
        "sections": request.sections or next(t["sections"] for t in REPORT_TEMPLATES if t["type"] == request.type),
        "employees": data,
    }


@router.get("/templates")
async def list_report_templates():
    """List available report templates with their sections."""
    return REPORT_TEMPLATES
