"""Project contributions endpoints."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.models import ProjectContribution, User
from app.schemas.schemas import ProjectContributionCreate, ProjectContributionResponse, ProjectContributionUpdate

router = APIRouter()


@router.get("/", response_model=List[ProjectContributionResponse])
async def list_contributions(
    employee_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    query = select(ProjectContribution)
    if employee_id:
        query = query.where(ProjectContribution.employee_id == employee_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=ProjectContributionResponse, status_code=201)
async def create_contribution(
    contribution: ProjectContributionCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    db_contribution = ProjectContribution(**contribution.model_dump())
    db.add(db_contribution)
    await db.commit()
    await db.refresh(db_contribution)
    return db_contribution


@router.patch("/{contribution_id}", response_model=ProjectContributionResponse)
async def update_contribution(
    contribution_id: str,
    updates: ProjectContributionUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    contribution = await db.get(ProjectContribution, contribution_id)
    if contribution is None:
        raise HTTPException(404, "Project contribution not found")
    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(contribution, field, value)
    await db.commit()
    await db.refresh(contribution)
    return contribution


@router.delete("/{contribution_id}", status_code=204)
async def delete_contribution(
    contribution_id: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    contribution = await db.get(ProjectContribution, contribution_id)
    if contribution is None:
        raise HTTPException(404, "Project contribution not found")
    await db.delete(contribution)
    await db.commit()
