"""Director notes endpoints — private, RBAC-enforced."""
from fastapi import APIRouter, HTTPException
from typing import List, Optional
from app.schemas.schemas import DirectorNoteCreate, DirectorNoteUpdate, DirectorNoteResponse

router = APIRouter()


@router.get("/", response_model=List[DirectorNoteResponse])
async def list_notes(
    employee_id: Optional[str] = None,
    category: Optional[str] = None,
    has_follow_up: Optional[bool] = None,
):
    """
    List director notes. Access restricted to Director/Admin roles.
    Notes are never visible to the subject employee.
    """
    pass


@router.post("/", response_model=DirectorNoteResponse, status_code=201)
async def create_note(note: DirectorNoteCreate):
    """Create a private director note. Director/Manager role required."""
    pass


@router.patch("/{note_id}", response_model=DirectorNoteResponse)
async def update_note(note_id: str, updates: DirectorNoteUpdate):
    pass


@router.delete("/{note_id}", status_code=204)
async def delete_note(note_id: str):
    pass
