"""One-time repair for evidence written by the pre-fix self-assessment importer.

Until `assessment_import.match_columns` learned to skip guidance columns, importing a
Skills_Self_Assessment workbook bound `evidence` to the sheet's `Evidence that would
show it` column — the rubric line printed next to each skill — instead of the
engineer's own `MY EVIDENCE` answer. That text is `skill_definitions.example_evidence`
verbatim, so every imported person ended up with the same evidence on every skill.

Re-importing the corrected file fixes the rows the engineer actually filled in, but a
blank cell means "leave unchanged", so the rest keep the boilerplate. This clears
exactly those: an assessment whose evidence still equals its own skill's example
evidence, character for character. Anything a human typed is left alone.

Run:  cd backend && python -m scripts.clear_boilerplate_evidence --dry-run
      cd backend && python -m scripts.clear_boilerplate_evidence
"""
import argparse
import asyncio

from sqlalchemy import func, select

from app.db.session import SessionLocal
from app.models.models import Employee, SkillAssessment, SkillDefinition


async def main(dry_run: bool) -> None:
    async with SessionLocal() as db:
        result = await db.execute(
            select(SkillAssessment, SkillDefinition, Employee)
            .join(SkillDefinition, SkillAssessment.skill_id == SkillDefinition.id)
            .join(Employee, SkillAssessment.employee_id == Employee.id)
            .where(
                SkillDefinition.example_evidence.isnot(None),
                SkillDefinition.example_evidence != "",
                func.trim(SkillAssessment.evidence) == func.trim(SkillDefinition.example_evidence),
            )
        )
        matches = result.all()

        if not matches:
            print("No boilerplate evidence found — nothing to clear.")
            return

        per_employee: dict[str, int] = {}
        for _assessment, _skill, employee in matches:
            per_employee[employee.name] = per_employee.get(employee.name, 0) + 1

        print(f"{len(matches)} assessment(s) still carry the catalog's example evidence:")
        for name, count in sorted(per_employee.items(), key=lambda kv: -kv[1]):
            print(f"  {count:4d}  {name}")

        if dry_run:
            print("\nDry run — nothing written. Re-run without --dry-run to clear these.")
            return

        for assessment, _skill, _employee in matches:
            assessment.evidence = None
        await db.commit()
        print(f"\nCleared evidence on {len(matches)} assessment(s).")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run", action="store_true", help="report what would be cleared, write nothing"
    )
    asyncio.run(main(parser.parse_args().dry_run))
