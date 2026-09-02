"""Write a staged assessment import batch to Postgres.

Kept apart from `assessment_import.py` so parsing/matching stays free of the session.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from typing import Any, Optional

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import (
    AssessmentImportBatch,
    AssessmentImportStatusEnum,
    AuditLog,
    Employee,
    SkillAssessment,
    User,
)
from app.services.assessment_import import WRITABLE_FIELDS

# A staged batch diffs against the catalog and the stored ratings as they were at
# upload time; past this, both may have moved far enough that the preview is a lie.
BATCH_MAX_AGE = timedelta(hours=24)


class ApplyError(Exception):
    def __init__(self, message: str, status_code: int = 409):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


async def resolve_employee_for_user(db: AsyncSession, user: User) -> Employee:
    """The Employee row belonging to the signed-in user.

    `employees.user_id` exists but is never populated (not by scripts/seed.py, not by
    auth.py, and EmployeeCreate has no field for it), so the email match is what
    actually resolves today. Backfilling user_id is tracked separately.
    """
    result = await db.execute(select(Employee).where(Employee.user_id == user.id))
    employee = result.scalars().first()
    if employee is not None:
        return employee

    if not user.email:
        raise ApplyError("Your account has no email address, so it cannot be linked to a team member.")
    result = await db.execute(
        select(Employee).where(func.lower(Employee.email) == user.email.strip().lower())
    )
    matches = result.scalars().all()
    if not matches:
        raise ApplyError(
            f"No team member is registered with the email {user.email}, so there is nothing "
            "to attach this assessment to."
        )
    if len(matches) > 1:
        raise ApplyError(f"More than one team member uses the email {user.email}.")
    return matches[0]


def _signature(values: dict[str, Any]) -> tuple[str, ...]:
    return tuple(sorted(name for name in values if name in WRITABLE_FIELDS))


async def apply_batch(db: AsyncSession, batch: AssessmentImportBatch, actor: User) -> dict[str, int]:
    """Write every `ok` row in one transaction, re-diffing against current state first.

    Rows are grouped by which fields they supply, because ON CONFLICT applies a single
    `set_` to every row in a statement — one statement per distinct field-combination
    is what keeps "blank means leave unchanged" honest without going back to a
    request-per-cell fan-out. In practice that is two or three statements for a
    whole-team file.
    """
    if batch.status == AssessmentImportStatusEnum.APPLIED:
        raise ApplyError("This import has already been applied.")
    if batch.status == AssessmentImportStatusEnum.DISCARDED:
        raise ApplyError("This import was discarded.")

    uploaded_at = batch.uploaded_at or datetime.utcnow()
    if datetime.utcnow() - uploaded_at > BATCH_MAX_AGE:
        raise ApplyError(
            "This import is more than 24 hours old and may no longer reflect current "
            "ratings. Upload the file again to get a fresh preview.",
            status_code=410,
        )

    candidates = [r for r in (batch.rows or []) if r.get("status") == "ok"]
    if not candidates:
        raise ApplyError("This import has no rows to apply.", status_code=400)

    # Re-diff: someone may have edited the grid between preview and commit.
    pairs = {(r["employee_id"], r["skill_id"]) for r in candidates}
    result = await db.execute(
        select(SkillAssessment).where(
            SkillAssessment.employee_id.in_({p[0] for p in pairs})
        )
    )
    current = {(a.employee_id, a.skill_id): a for a in result.scalars().all()}

    now = datetime.utcnow()
    groups: dict[tuple[str, ...], list[dict[str, Any]]] = {}
    applied = 0
    skipped_unchanged = 0

    for row in candidates:
        key = (row["employee_id"], row["skill_id"])
        values = {k: v for k, v in (row.get("values") or {}).items() if k in WRITABLE_FIELDS}
        if not values:
            continue

        stored = current.get(key)
        if stored is not None and all(getattr(stored, name, None) == value for name, value in values.items()):
            # Nothing to do — and writing anyway would re-stamp assessed_at on a no-op.
            skipped_unchanged += 1
            continue

        assessed_at = _parse_iso(row.get("assessed_at")) or now
        payload = {
            # Core multi-values insert() does not apply the Python-side
            # default=generate_uuid, so the PK has to be explicit.
            "id": str(uuid.uuid4()),
            "employee_id": row["employee_id"],
            "skill_id": row["skill_id"],
            "assessed_at": assessed_at,
            "assessed_by": actor.id,
            **values,
        }
        groups.setdefault(_signature(values), []).append(payload)
        applied += 1

    for signature, payloads in groups.items():
        stmt = pg_insert(SkillAssessment).values(payloads)
        stmt = stmt.on_conflict_do_update(
            constraint="uq_employee_skill",
            set_={
                **{name: getattr(stmt.excluded, name) for name in signature},
                "assessed_at": stmt.excluded.assessed_at,
                "assessed_by": stmt.excluded.assessed_by,
            },
        )
        await db.execute(stmt)

    batch.status = AssessmentImportStatusEnum.APPLIED
    batch.applied_at = now
    batch.rows_applied = applied

    db.add(
        AuditLog(
            user_id=actor.id,
            action="skills.import.commit",
            resource_type="assessment_import_batch",
            resource_id=batch.id,
            details={
                "filename": batch.filename,
                "source": batch.source.value if batch.source else None,
                "rows_applied": applied,
                "skipped_unchanged": skipped_unchanged,
            },
        )
    )

    await db.commit()
    return {"applied": applied, "skipped_unchanged": skipped_unchanged, "statements": len(groups)}


def _parse_iso(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None
