"""Director notes endpoints — private, RBAC-enforced."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user, get_scope, require_role
from app.core.rbac import Scope
from app.db.session import get_db
from app.models.models import DirectorNote, NoteCategoryEnum, User
from app.schemas.schemas import DirectorNoteCreate, DirectorNoteResponse, DirectorNoteUpdate

router = APIRouter()


def _to_response(note: DirectorNote) -> DirectorNoteResponse:
    return DirectorNoteResponse(
        id=note.id,
        employee_id=note.employee_id,
        author_id=note.author_id,
        author_name=note.author.name if note.author else "Unknown",
        category=note.category,
        title=note.title,
        content=note.content,
        follow_up_date=note.follow_up_date,
        is_private=note.is_private,
        tags=note.tags or [],
        created_at=note.created_at,
        updated_at=note.updated_at,
    )


@router.get("/", response_model=List[DirectorNoteResponse])
async def list_notes(
    employee_id: Optional[str] = None,
    category: Optional[str] = None,
    has_follow_up: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    scope: Scope = Depends(get_scope),
):
    """
    List director notes about members within the caller's scope.
    Notes are never visible to the subject employee.

    The role gate alone used to be the whole check, which meant any director or
    manager could read every note about every engineer in every organization.
    """
    if user.role.value not in ("director", "admin", "manager"):
        raise HTTPException(403, "Insufficient permissions")

    query = select(DirectorNote).options(selectinload(DirectorNote.author))
    if employee_id:
        scope.assert_can_view_employee(employee_id)
        query = query.where(DirectorNote.employee_id == employee_id)
    elif not scope.unrestricted:
        if not scope.employee_ids:
            return []
        query = query.where(DirectorNote.employee_id.in_(scope.employee_ids))
    if category:
        query = query.where(DirectorNote.category == NoteCategoryEnum(category))
    if has_follow_up is not None:
        query = query.where(DirectorNote.follow_up_date.isnot(None) == has_follow_up)

    result = await db.execute(query)
    notes = result.scalars().all()
    # Private notes are only visible to their author (or director/admin).
    if user.role.value not in ("director", "admin"):
        notes = [n for n in notes if not n.is_private or n.author_id == user.id]
    return [_to_response(n) for n in notes]


@router.post("/", response_model=DirectorNoteResponse, status_code=201)
async def create_note(
    note: DirectorNoteCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("director", "manager", "admin")),
    scope: Scope = Depends(get_scope),
):
    """Create a private director note. Director/Manager role required, and only
    about a member inside the author's scope."""
    scope.assert_can_view_employee(note.employee_id)
    db_note = DirectorNote(**note.model_dump(), author_id=user.id)
    db.add(db_note)
    await db.commit()
    query = select(DirectorNote).options(selectinload(DirectorNote.author)).where(DirectorNote.id == db_note.id)
    result = await db.execute(query)
    return _to_response(result.scalar_one())


@router.patch("/{note_id}", response_model=DirectorNoteResponse)
async def update_note(
    note_id: str,
    updates: DirectorNoteUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    scope: Scope = Depends(get_scope),
):
    query = select(DirectorNote).options(selectinload(DirectorNote.author)).where(DirectorNote.id == note_id)
    result = await db.execute(query)
    note = result.scalar_one_or_none()
    if note is None:
        raise HTTPException(404, "Note not found")
    scope.assert_can_view_employee(note.employee_id)
    if note.author_id != user.id and user.role.value not in ("director", "admin"):
        raise HTTPException(403, "Insufficient permissions")

    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(note, field, value)
    await db.commit()
    result = await db.execute(query)
    return _to_response(result.scalar_one())


@router.delete("/{note_id}", status_code=204)
async def delete_note(
    note_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    scope: Scope = Depends(get_scope),
):
    note = await db.get(DirectorNote, note_id)
    if note is None:
        raise HTTPException(404, "Note not found")
    scope.assert_can_view_employee(note.employee_id)
    if note.author_id != user.id and user.role.value not in ("director", "admin"):
        raise HTTPException(403, "Insufficient permissions")
    await db.delete(note)
    await db.commit()
