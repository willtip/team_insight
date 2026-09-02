"""Shared helpers for building EmployeeDetail responses with all nested data eager-loaded."""
from sqlalchemy.orm import selectinload

from app.models.models import DirectorNote, Employee
from app.schemas.schemas import DirectorNoteResponse, EmployeeDetail, ProfessionalDevelopmentResponse

DETAIL_RELATIONSHIPS = (
    selectinload(Employee.skills),
    selectinload(Employee.goals),
    selectinload(Employee.performance_score),
    selectinload(Employee.manager),
    selectinload(Employee.project_contributions),
    selectinload(Employee.certifications),
    selectinload(Employee.training_records),
    selectinload(Employee.conferences),
    selectinload(Employee.mentoring_relations),
    selectinload(Employee.director_notes).selectinload(DirectorNote.author),
)


def to_employee_detail(employee: Employee) -> EmployeeDetail:
    employee.tags = employee.tags or []
    detail = EmployeeDetail.model_validate(employee)
    detail.manager_name = employee.manager.name if employee.manager else None
    detail.development = ProfessionalDevelopmentResponse(
        certifications=employee.certifications,
        training=employee.training_records,
        conferences=employee.conferences,
        mentoring=employee.mentoring_relations,
    )
    detail.notes = [
        DirectorNoteResponse(
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
        for note in employee.director_notes
    ]
    return detail
