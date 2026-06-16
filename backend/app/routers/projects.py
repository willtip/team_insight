"""Project contributions endpoints."""
from fastapi import APIRouter
from typing import List, Optional
from app.schemas.schemas import ProjectContributionCreate, ProjectContributionResponse

router = APIRouter()


@router.get("/", response_model=List[ProjectContributionResponse])
async def list_contributions(employee_id: Optional[str] = None):
    pass


@router.post("/", response_model=ProjectContributionResponse, status_code=201)
async def create_contribution(contribution: ProjectContributionCreate):
    pass


@router.delete("/{contribution_id}", status_code=204)
async def delete_contribution(contribution_id: str):
    pass
