"""1:1 meeting record endpoints (parsed from meeting notes on the frontend)."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_scope
from app.core.rbac import Scope
from app.db.session import get_db
from app.models.models import OneOnOne
from app.schemas.schemas import OneOnOneCreate, OneOnOneResponse, OneOnOneUpdate

router = APIRouter()


@router.get("/", response_model=List[OneOnOneResponse])
async def list_one_on_ones(
    employee_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    scope: Scope = Depends(get_scope),
):
    query = select(OneOnOne)
    if employee_id:
        scope.assert_can_view_employee(employee_id)
        query = query.where(OneOnOne.employee_id == employee_id)
    elif not scope.unrestricted:
        if not scope.employee_ids:
            return []
        query = query.where(OneOnOne.employee_id.in_(scope.employee_ids))
    result = await db.execute(query.order_by(OneOnOne.date.desc()))
    return result.scalars().all()


@router.post("/", response_model=OneOnOneResponse, status_code=201)
async def create_one_on_one(
    one_on_one: OneOnOneCreate,
    db: AsyncSession = Depends(get_db),
    scope: Scope = Depends(get_scope),
):
    scope.assert_can_view_employee(one_on_one.employee_id)
    db_one_on_one = OneOnOne(
        **one_on_one.model_dump(exclude={"ids", "action_items"}),
        ids=[item.model_dump() for item in one_on_one.ids],
        action_items=[item.model_dump() for item in one_on_one.action_items],
    )
    db.add(db_one_on_one)
    await db.commit()
    await db.refresh(db_one_on_one)
    return db_one_on_one


@router.patch("/{one_on_one_id}", response_model=OneOnOneResponse)
async def update_one_on_one(
    one_on_one_id: str,
    updates: OneOnOneUpdate,
    db: AsyncSession = Depends(get_db),
    scope: Scope = Depends(get_scope),
):
    one_on_one = await db.get(OneOnOne, one_on_one_id)
    if one_on_one is None:
        raise HTTPException(404, "One-on-one not found")
    scope.assert_can_view_employee(one_on_one.employee_id)

    data = updates.model_dump(exclude={"ids", "action_items"}, exclude_unset=True)
    for field, value in data.items():
        setattr(one_on_one, field, value)
    if updates.ids is not None:
        one_on_one.ids = [item.model_dump() for item in updates.ids]
    if updates.action_items is not None:
        one_on_one.action_items = [item.model_dump() for item in updates.action_items]

    await db.commit()
    await db.refresh(one_on_one)
    return one_on_one


@router.delete("/{one_on_one_id}", status_code=204)
async def delete_one_on_one(
    one_on_one_id: str, db: AsyncSession = Depends(get_db), scope: Scope = Depends(get_scope)
):
    one_on_one = await db.get(OneOnOne, one_on_one_id)
    if one_on_one is None:
        raise HTTPException(404, "One-on-one not found")
    scope.assert_can_view_employee(one_on_one.employee_id)
    await db.delete(one_on_one)
    await db.commit()
