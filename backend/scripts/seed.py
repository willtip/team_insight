"""One-time seed: loads backend/seed_data/*.json (dumped from lib/mock-data.ts,
lib/skill-catalog.ts) into Postgres via the app's own models/session.

Run: cd backend && python -m scripts.seed
"""
import asyncio
import json
from datetime import datetime
from pathlib import Path

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.models import (
    Certification,
    Conference,
    DirectorNote,
    Employee,
    Goal,
    GoalCategoryEnum,
    GoalPriorityEnum,
    GoalStatusEnum,
    MentoringRelation,
    NoteCategoryEnum,
    PerformanceScore,
    ProjectContribution,
    PromotionReadinessEnum,
    RoleProfile,
    SkillAssessment,
    SkillDefinition,
    SkillThresholds,
    Training,
    User,
    UserRoleEnum,
)

SEED_DIR = Path(__file__).resolve().parent.parent / "seed_data"


def load(name: str):
    return json.loads((SEED_DIR / name).read_text())


def parse_date(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


async def main() -> None:
    async with SessionLocal() as db:
        result = await db.execute(select(User).where(User.email == "director@teaminsight.local"))
        director = result.scalar_one_or_none()
        if director is None:
            director = User(email="director@teaminsight.local", name="William Tipton", role=UserRoleEnum.DIRECTOR)
            db.add(director)
            await db.flush()

        for s in load("skill_catalog.json"):
            if await db.get(SkillDefinition, s["id"]) is not None:
                continue
            db.add(
                SkillDefinition(
                    id=s["id"],
                    code=s["code"],
                    domain=s["domain"],
                    subdomain=s.get("subdomain"),
                    name=s["name"],
                    observable_capability=s.get("observableCapability"),
                    example_evidence=s.get("exampleEvidence"),
                    critical=s.get("critical", False),
                    target_level=s["targetLevel"],
                    weight=s.get("weight", 1.0),
                    custom=s.get("custom", False),
                )
            )
        await db.flush()

        for p in load("role_profiles.json"):
            if await db.get(RoleProfile, p["id"]) is not None:
                continue
            db.add(
                RoleProfile(
                    id=p["id"],
                    name=p["name"],
                    primary_outcome=p.get("primaryOutcome"),
                    depth_areas=p.get("depthAreas"),
                    working_breadth=p.get("workingBreadth"),
                    ai_expectation=p.get("aiExpectation"),
                    evidence=p.get("evidence"),
                    breadth_target=p.get("breadthTarget", 0),
                    depth_target=p.get("depthTarget", 0),
                    depth_skill_ids=p.get("depthSkillIds", []),
                )
            )
        await db.flush()

        result = await db.execute(select(SkillThresholds).where(SkillThresholds.is_active.is_(True)))
        if result.scalar_one_or_none() is None:
            t = load("thresholds.json")
            db.add(SkillThresholds(breadth=t["breadth"], coverage=t["coverage"], depth=t["depth"]))

        for e in load("employees.json"):
            existing = await db.execute(select(Employee).where(Employee.employee_id == e["employeeId"]))
            if existing.scalar_one_or_none() is not None:
                continue

            emp = Employee(
                id=e["id"],
                employee_id=e["employeeId"],
                name=e["name"],
                title=e["title"],
                level=e.get("level"),
                department=e.get("department"),
                hire_date=parse_date(e.get("hireDate")),
                location=e.get("location"),
                email=e.get("email"),
                bio=e.get("bio"),
                career_aspirations=e.get("careerAspirations"),
                is_high_potential=e.get("isHighPotential", False),
                needs_coaching=e.get("needsCoaching", False),
                tags=e.get("tags", []),
                promotion_readiness=(
                    PromotionReadinessEnum(e["promotionReadiness"]) if e.get("promotionReadiness") else None
                ),
                role_profile_id=e.get("roleProfileId"),
                # mock managerId ("mgr-001") is a placeholder director, not a seeded employee row
            )
            db.add(emp)
            await db.flush()

            for s in e.get("skills", []):
                db.add(
                    SkillAssessment(
                        employee_id=emp.id,
                        skill_id=s["skillId"],
                        self_rating=s.get("selfRating"),
                        reviewer_rating=s.get("reviewerRating"),
                        target_override=s.get("targetOverride"),
                        evidence=s.get("evidence"),
                        evidence_url=s.get("evidenceUrl"),
                        assessed_at=parse_date(s.get("assessedAt")),
                    )
                )

            for g in e.get("goals", []):
                db.add(
                    Goal(
                        employee_id=emp.id,
                        title=g["title"],
                        description=g.get("description"),
                        strategic_alignment=g.get("strategicAlignment"),
                        due_date=parse_date(g.get("dueDate")),
                        priority=GoalPriorityEnum(g["priority"]) if g.get("priority") else None,
                        progress=g.get("progress", 0),
                        status=GoalStatusEnum(g["status"]) if g.get("status") else GoalStatusEnum.NOT_STARTED,
                        category=GoalCategoryEnum(g["category"]) if g.get("category") else None,
                    )
                )

            for p in e.get("projectContributions", []):
                db.add(
                    ProjectContribution(
                        employee_id=emp.id,
                        project_name=p["projectName"],
                        initiative=p.get("initiative"),
                        description=p.get("description"),
                        business_impact=p.get("businessImpact"),
                        technical_impact=p.get("technicalImpact"),
                        leadership_score=p.get("leadershipScore"),
                        collaboration_score=p.get("collaborationScore"),
                        innovation_score=p.get("innovationScore"),
                        date=parse_date(p.get("date")),
                        evidence_links=p.get("evidenceLinks", []),
                    )
                )

            dev = e.get("development", {})
            for c in dev.get("certifications", []):
                db.add(
                    Certification(
                        employee_id=emp.id,
                        name=c["name"],
                        provider=c.get("provider"),
                        date_earned=parse_date(c.get("dateEarned")),
                        expiration_date=parse_date(c.get("expirationDate")),
                        credential_id=c.get("credentialId"),
                    )
                )
            for t in dev.get("training", []):
                db.add(
                    Training(
                        employee_id=emp.id,
                        course_name=t["courseName"],
                        platform=t.get("platform"),
                        status=t.get("status"),
                        completion_date=parse_date(t.get("completionDate")),
                        hours_completed=t.get("hoursCompleted"),
                    )
                )
            for c in dev.get("conferences", []):
                db.add(
                    Conference(
                        employee_id=emp.id,
                        event_name=c["eventName"],
                        date=parse_date(c.get("date")),
                        role=c.get("role"),
                        key_learnings=c.get("keyLearnings"),
                    )
                )
            for m in dev.get("mentoring", []):
                db.add(
                    MentoringRelation(
                        employee_id=emp.id,
                        type=m.get("type"),
                        partner_name=m.get("partnerName"),
                        start_date=parse_date(m.get("startDate")),
                        end_date=parse_date(m.get("endDate")),
                        outcomes=m.get("outcomes"),
                        active=m.get("active", True),
                    )
                )

            for n in e.get("notes", []):
                db.add(
                    DirectorNote(
                        employee_id=emp.id,
                        author_id=director.id,
                        category=NoteCategoryEnum(n["category"]),
                        title=n["title"],
                        content=n["content"],
                        follow_up_date=parse_date(n.get("followUpDate")),
                        is_private=n.get("isPrivate", True),
                        tags=n.get("tags", []),
                    )
                )

            ps = e.get("performanceScore")
            if ps:
                db.add(
                    PerformanceScore(
                        employee_id=emp.id,
                        overall=ps.get("overall", 0),
                        goal_achievement=ps.get("goalAchievement", 0),
                        project_contributions=ps.get("projectContributions", 0),
                        professional_development=ps.get("professionalDevelopment", 0),
                        leadership_behaviors=ps.get("leadershipBehaviors", 0),
                        collaboration=ps.get("collaboration", 0),
                        innovation=ps.get("innovation", 0),
                        growth_score=ps.get("growthScore", 0),
                        leadership_readiness=ps.get("leadershipReadiness", 0),
                        promotion_readiness=ps.get("promotionReadiness", 0),
                        trend=ps.get("trend", "stable"),
                    )
                )

        await db.commit()
        print("Seed complete.")


if __name__ == "__main__":
    asyncio.run(main())
