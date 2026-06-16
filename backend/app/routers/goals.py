"""Goal management endpoints."""
from fastapi import APIRouter, Query
from typing import Optional, List
from app.schemas.schemas import GoalCreate, GoalUpdate, GoalResponse

router = APIRouter()


@router.get("/", response_model=List[GoalResponse])
async def list_goals(
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    at_risk_only: bool = False,
):
    """List goals with filtering. Returns team's goals for directors/managers."""
    pass


@router.post("/", response_model=GoalResponse, status_code=201)
async def create_goal(goal: GoalCreate):
    pass


@router.patch("/{goal_id}", response_model=GoalResponse)
async def update_goal(goal_id: str, updates: GoalUpdate):
    pass


@router.delete("/{goal_id}", status_code=204)
async def delete_goal(goal_id: str):
    pass
