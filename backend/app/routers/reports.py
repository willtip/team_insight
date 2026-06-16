"""Report generation endpoints."""
from fastapi import APIRouter, Response
from app.schemas.schemas import ReportRequest

router = APIRouter()


@router.post("/generate")
async def generate_report(request: ReportRequest):
    """
    Generate a performance report.
    Supported types: team-health, goal-status, promotion-pipeline, skills-readiness,
                    coaching-summary, succession-planning.
    Supported formats: PDF, Excel, PowerPoint.
    """
    pass


@router.get("/templates")
async def list_report_templates():
    """List available report templates with their sections."""
    pass
