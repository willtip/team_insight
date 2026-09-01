"""Goal management endpoints."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.models import Goal, GoalCategoryEnum, GoalPriorityEnum, GoalStatusEnum, User
from app.schemas.schemas import GoalCreate, GoalResponse, GoalUpdate

router = APIRouter()


@router.get("/", response_model=List[GoalResponse])
async def list_goals(
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    at_risk_only: bool = False,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """List goals with filtering. Returns team's goals for directors/managers."""
    query = select(Goal)
    if employee_id:
        query = query.where(Goal.employee_id == employee_id)
    if status:
        query = query.where(Goal.status == GoalStatusEnum(status))
    if category:
        query = query.where(Goal.category == GoalCategoryEnum(category))
    if priority:
        query = query.where(Goal.priority == GoalPriorityEnum(priority))
    if at_risk_only:
        query = query.where(Goal.status == GoalStatusEnum.AT_RISK)

    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=GoalResponse, status_code=201)
async def create_goal(
    goal: GoalCreate, db: AsyncSession = Depends(get_db), _user: User = Depends(get_current_user)
):
    db_goal = Goal(**goal.model_dump())
    db.add(db_goal)
    await db.commit()
    await db.refresh(db_goal)
    return db_goal


@router.patch("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: str,
    updates: GoalUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    goal = await db.get(Goal, goal_id)
    if goal is None:
        raise HTTPException(404, "Goal not found")
    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(goal, field, value)
    await db.commit()
    await db.refresh(goal)
    return goal


@router.delete("/{goal_id}", status_code=204)
async def delete_goal(
    goal_id: str, db: AsyncSession = Depends(get_db), _user: User = Depends(get_current_user)
):
    goal = await db.get(Goal, goal_id)
    if goal is None:
        raise HTTPException(404, "Goal not found")
    await db.delete(goal)
    await db.commit()
