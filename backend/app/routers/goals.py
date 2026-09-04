"""Goal management endpoints."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_scope
from app.core.rbac import Scope
from app.db.session import get_db
from app.models.models import Goal, GoalCategoryEnum, GoalPriorityEnum, GoalStatusEnum
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
    scope: Scope = Depends(get_scope),
):
    """List goals, scoped to the members the caller may see.

    Naming a specific employee outside that scope is a 403 rather than an empty list —
    otherwise the endpoint doubles as an oracle for who exists in other organizations.
    """
    query = select(Goal)
    if employee_id:
        scope.assert_can_view_employee(employee_id)
        query = query.where(Goal.employee_id == employee_id)
    elif not scope.unrestricted:
        if not scope.employee_ids:
            return []
        query = query.where(Goal.employee_id.in_(scope.employee_ids))
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
    goal: GoalCreate, db: AsyncSession = Depends(get_db), scope: Scope = Depends(get_scope)
):
    scope.assert_can_view_employee(goal.employee_id)
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
    scope: Scope = Depends(get_scope),
):
    goal = await db.get(Goal, goal_id)
    if goal is None:
        raise HTTPException(404, "Goal not found")
    scope.assert_can_view_employee(goal.employee_id)
    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(goal, field, value)
    await db.commit()
    await db.refresh(goal)
    return goal


@router.delete("/{goal_id}", status_code=204)
async def delete_goal(
    goal_id: str, db: AsyncSession = Depends(get_db), scope: Scope = Depends(get_scope)
):
    goal = await db.get(Goal, goal_id)
    if goal is None:
        raise HTTPException(404, "Goal not found")
    scope.assert_can_view_employee(goal.employee_id)
    await db.delete(goal)
    await db.commit()
