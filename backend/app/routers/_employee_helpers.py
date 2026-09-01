"""Shared helpers for building EmployeeDetail responses with all nested data eager-loaded."""
from sqlalchemy.orm import selectinload

from app.models.models import Employee
from app.schemas.schemas import EmployeeDetail, ProfessionalDevelopmentResponse

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
    return detail
