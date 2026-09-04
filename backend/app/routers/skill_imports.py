"""Bulk assessment import: spreadsheet/CSV upload and the in-app self-assessment form.

Mounted on its own prefix rather than added to skills.py, which already has to keep
every literal route declared above its `/{employee_id}` catch-all.
"""
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_scope, require_role
from app.core.rbac import Scope
from app.db.session import get_db
from app.models.models import (
    AssessmentImportBatch,
    AssessmentImportSourceEnum,
    AssessmentImportStatusEnum,
    Employee,
    SkillAssessment,
    SkillDefinition,
    User,
)
from app.schemas.schemas import (
    ImportBatchResponse,
    ImportBatchSummary,
    ImportCommitResult,
    SelfAssessmentSubmit,
)
from app.services.assessment_apply import ApplyError, apply_batch, resolve_employee_for_user
from app.services.assessment_import import (
    MANAGER_FIELDS,
    SELF_FIELDS,
    ImportError_,
    ParsedRow,
    parse_bytes,
    resolve_rows,
)

router = APIRouter()

MANAGER_ROLES = ("director", "manager", "admin")


def _is_manager(user: User) -> bool:
    return user.role.value in MANAGER_ROLES


async def _load_context(db: AsyncSession, scope: Scope):
    """Matching context for an import, narrowed to members the uploader may see.

    Row matching is what turns a name or email in a spreadsheet into an employee id,
    so an unscoped roster here would let a team lead write reviewer ratings onto
    engineers in another organization just by naming them in a file. Rows naming
    someone out of scope now fall out as `unknown_employee` in the preview.
    """
    employee_query = select(Employee)
    if not scope.unrestricted:
        employee_query = employee_query.where(Employee.id.in_(scope.employee_ids or {""}))
    employees = (await db.execute(employee_query)).scalars().all()
    catalog = (await db.execute(select(SkillDefinition))).scalars().all()
    existing = (await db.execute(select(SkillAssessment))).scalars().all()
    return employees, catalog, existing


def _to_response(batch: AssessmentImportBatch) -> dict:
    return {
        "id": batch.id,
        "filename": batch.filename,
        "source": batch.source.value,
        "status": batch.status.value,
        "uploaded_by": batch.uploaded_by,
        "uploaded_at": batch.uploaded_at,
        "applied_at": batch.applied_at,
        "rows_read": batch.rows_read or 0,
        "rows_applied": batch.rows_applied or 0,
        "counts": batch.counts or {},
        "warnings": batch.warnings or [],
        "rows": batch.rows or [],
    }


async def _get_owned_batch(db: AsyncSession, batch_id: str, user: User) -> AssessmentImportBatch:
    batch = await db.get(AssessmentImportBatch, batch_id)
    if batch is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Import not found")
    if batch.uploaded_by != user.id and user.role.value not in ("director", "admin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "That import belongs to someone else")
    return batch


@router.post("", response_model=ImportBatchResponse, status_code=201)
async def upload_import(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role(*MANAGER_ROLES)),
    scope: Scope = Depends(get_scope),
):
    """Parse and stage an upload. Writes no assessments — commit does that."""
    content = await file.read()
    try:
        parsed, warnings, source = parse_bytes(file.filename or "", content)
    except ImportError_ as exc:
        raise HTTPException(exc.status_code, exc.message)

    employees, catalog, existing = await _load_context(db, scope)
    preview = resolve_rows(parsed, employees, catalog, existing, allowed_fields=MANAGER_FIELDS)

    batch = AssessmentImportBatch(
        filename=file.filename,
        source=AssessmentImportSourceEnum(source),
        status=AssessmentImportStatusEnum.PENDING,
        uploaded_by=user.id,
        rows_read=preview.counts["rows_read"],
        counts=preview.counts,
        warnings=warnings + preview.warnings,
        rows=[r.to_json() for r in preview.rows],
    )
    db.add(batch)
    await db.commit()
    await db.refresh(batch)
    return _to_response(batch)


@router.get("", response_model=List[ImportBatchSummary])
async def list_imports(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = select(AssessmentImportBatch).order_by(AssessmentImportBatch.uploaded_at.desc())
    if user.role.value not in ("director", "admin"):
        query = query.where(AssessmentImportBatch.uploaded_by == user.id)
    batches = (await db.execute(query.limit(50))).scalars().all()
    # Summaries deliberately omit `rows` — a full-team batch is ~700 of them.
    return [{k: v for k, v in _to_response(b).items() if k != "rows"} for b in batches]


@router.get("/{batch_id}", response_model=ImportBatchResponse)
async def get_import(
    batch_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _to_response(await _get_owned_batch(db, batch_id, user))


@router.post("/{batch_id}/commit", response_model=ImportCommitResult)
async def commit_import(
    batch_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role(*MANAGER_ROLES)),
    scope: Scope = Depends(get_scope),
):
    batch = await _get_owned_batch(db, batch_id, user)
    # Staging resolved these ids under the uploader's scope, but that scope can have
    # narrowed in between (a team handed off, a leader replaced), so re-check at the
    # point of write rather than trusting the stored rows.
    scope.assert_can_view_employees(
        {row["employee_id"] for row in (batch.rows or []) if row.get("employee_id")}
    )
    try:
        result = await apply_batch(db, batch, user)
    except ApplyError as exc:
        raise HTTPException(exc.status_code, exc.message)
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"The import conflicted with existing data and was rolled back: {exc.orig}",
        )
    return {"batch_id": batch.id, **result}


@router.delete("/{batch_id}", status_code=204)
async def discard_import(
    batch_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role(*MANAGER_ROLES)),
):
    batch = await _get_owned_batch(db, batch_id, user)
    if batch.status == AssessmentImportStatusEnum.APPLIED:
        raise HTTPException(status.HTTP_409_CONFLICT, "That import has already been applied")
    batch.status = AssessmentImportStatusEnum.DISCARDED
    await db.commit()


@router.post("/self-assessment", response_model=ImportCommitResult, status_code=201)
async def submit_self_assessment(
    payload: SelfAssessmentSubmit,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    scope: Scope = Depends(get_scope),
):
    """In-app intake form.

    Applied immediately rather than staged for review: a reviewer rating always
    supersedes a self rating (finalRating = reviewerRating ?? selfRating), so holding
    self ratings behind approval buys no safety. The batch row is still written, so
    the submission is auditable exactly like an uploaded file.
    """
    manager = _is_manager(user)
    if manager and payload.employee_id:
        # A manager role alone is not authority over this particular person.
        scope.assert_can_view_employee(payload.employee_id)
        target = await db.get(Employee, payload.employee_id)
        if target is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Employee not found")
    else:
        try:
            target = await resolve_employee_for_user(db, user)
        except ApplyError as exc:
            raise HTTPException(exc.status_code, exc.message)
        # Refuse rather than silently redirecting the submission onto the caller's own
        # row — quietly writing somewhere the caller did not ask for is worse than an error.
        if payload.employee_id and payload.employee_id != target.id:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                "You may only submit a self-assessment for yourself.",
            )

    parsed = [
        ParsedRow(
            row_number=i + 1,
            employee_code=target.employee_id,
            employee_email=target.email,
            employee_name=target.name,
            skill_code=item.skill_id,
            values={
                **({"self_rating": item.self_rating} if item.self_rating is not None else {}),
                **({"evidence": item.evidence} if item.evidence else {}),
            },
        )
        for i, item in enumerate(payload.items)
    ]

    employees, catalog, existing = await _load_context(db, scope)
    preview = resolve_rows(
        parsed,
        employees,
        catalog,
        existing,
        allowed_fields=MANAGER_FIELDS if manager else SELF_FIELDS,
        restrict_to_employee_id=None if manager else target.id,
    )

    batch = AssessmentImportBatch(
        filename=None,
        source=AssessmentImportSourceEnum.FORM,
        status=AssessmentImportStatusEnum.PENDING,
        uploaded_by=user.id,
        submitted_for_employee_id=target.id,
        rows_read=preview.counts["rows_read"],
        counts=preview.counts,
        warnings=preview.warnings,
        rows=[r.to_json() for r in preview.rows],
    )
    db.add(batch)
    await db.commit()
    await db.refresh(batch)

    try:
        result = await apply_batch(db, batch, user)
    except ApplyError as exc:
        raise HTTPException(exc.status_code, exc.message)
    return {"batch_id": batch.id, **result}
