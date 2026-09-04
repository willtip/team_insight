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
    Organization,
    PerformanceScore,
    ProjectContribution,
    PromotionReadinessEnum,
    RoleProfile,
    SkillAssessment,
    SkillDefinition,
    SkillThresholds,
    Team,
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
        result = await db.execute(select(User).where(User.email == "director@teaminsight.dev"))
        director = result.scalar_one_or_none()
        if director is None:
            # Upgrade databases seeded before the valid development domain was used.
            result = await db.execute(select(User).where(User.email == "director@teaminsight.local"))
            director = result.scalar_one_or_none()
            if director is not None:
                director.email = "director@teaminsight.dev"
            else:
                director = User(email="director@teaminsight.dev", name="William Tipton", role=UserRoleEnum.DIRECTOR)
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

        # The mock roster names mgr-001 as every engineer's manager. Make that a
        # real employee linked to the local director account so RBAC has an identity.
        director_employee = await db.get(Employee, "mgr-001")
        if director_employee is None:
            director_employee = Employee(
                id="mgr-001",
                user_id=director.id,
                employee_id="ASE-1000",
                name="William Tipton",
                title="Director, Automation Solution Engineering",
                level="L7",
                department="Automation Solution Engineering",
                email=director.email,
                location="",
                hire_date=parse_date("2018-01-01"),
                tags=[],
            )
            db.add(director_employee)
            await db.flush()

        # Every engineer must be scoped under an organization/team for RBAC, so seed a
        # default org+team for the legacy mock roster. Admins can add more via /admin.
        result = await db.execute(select(Organization).where(Organization.name == "Acme Corporation"))
        default_org = result.scalar_one_or_none()
        if default_org is None:
            default_org = Organization(
                name="Acme Corporation",
                description="Default organization for seeded data",
                leader_id=director_employee.id,
                created_by_user_id=director.id,
            )
            db.add(default_org)
            await db.flush()
        elif default_org.leader_id is None:
            default_org.leader_id = director_employee.id

        result = await db.execute(
            select(Team).where(Team.organization_id == default_org.id, Team.name == "Automation Solution Engineering")
        )
        default_team = result.scalar_one_or_none()
        if default_team is None:
            default_team = Team(
                organization_id=default_org.id,
                name="Automation Solution Engineering",
                description="Default team for seeded data",
                lead_id=director_employee.id,
            )
            db.add(default_team)
            await db.flush()
        elif default_team.lead_id is None:
            default_team.lead_id = director_employee.id

        director_employee.user_id = director.id
        director_employee.email = director.email
        director_employee.organization_id = default_org.id
        director_employee.team_id = default_team.id

        for e in load("employees.json"):
            existing_result = await db.execute(select(Employee).where(Employee.employee_id == e["employeeId"]))
            existing = existing_result.scalar_one_or_none()
            if existing is not None:
                # Backfill org/team on employees seeded before this scoping existed.
                if existing.organization_id is None:
                    existing.organization_id = default_org.id
                if existing.team_id is None:
                    existing.team_id = default_team.id
                if existing.manager_id is None:
                    existing.manager_id = director_employee.id
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
                organization_id=default_org.id,
                team_id=default_team.id,
                manager_id=director_employee.id,
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

        await db.flush()
        await seed_scoping_personas(db, default_org, default_team, director_employee)

        await db.commit()
        print("Seed complete.")


async def seed_scoping_personas(db, default_org, default_team, director_employee) -> None:
    """Split the seeded roster across two organizations and give each level a login.

    A single org with a single team cannot demonstrate scoping — every query returns
    everything and a broken permission check looks identical to a working one. This
    builds the smallest arrangement that tells them apart:

      Acme Corporation      (org leader: the seeded director)
        Automation Solution Engineering  (lead: platform-lead@teaminsight.dev)
        Reliability Engineering          (lead: reliability-lead@teaminsight.dev)
      Northwind Robotics    (org leader: northwind-director@teaminsight.dev)
        Controls Engineering             (lead: the *same* Northwind director)

    The Northwind director is the dual-role case: an org-level leader who also leads
    a team inside their own org. Their team grant is a subset of their org grant, so
    the union has to come out as exactly the org scope.
    """
    roster = (
        await db.execute(
            select(Employee)
            .where(Employee.organization_id == default_org.id)
            .order_by(Employee.id)
        )
    ).scalars().all()
    roster = [e for e in roster if e.id != director_employee.id]
    if len(roster) < 4:
        return  # nothing to split

    async def team_for(org, name, description):
        found = (await db.execute(
            select(Team).where(Team.organization_id == org.id, Team.name == name)
        )).scalar_one_or_none()
        if found is None:
            found = Team(organization_id=org.id, name=name, description=description)
            db.add(found)
            await db.flush()
        return found

    async def persona(email, name, role, employee, title):
        """Link a login to an existing employee row so the chain is walkable."""
        user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
        if user is None:
            user = User(email=email, name=name, role=role)
            db.add(user)
            await db.flush()
        assigned_employee = (await db.execute(
            select(Employee).where(Employee.user_id == user.id)
        )).scalar_one_or_none()
        if assigned_employee is not None and assigned_employee.id != employee.id:
            assigned_employee.user_id = None
        employee.user_id = user.id
        employee.title = title
        await db.flush()
        return user

    # --- Acme: a second team, so the org leader has more than one to look at ---
    reliability = await team_for(
        default_org, "Reliability Engineering", "Second Acme team, for RBAC scoping demos"
    )
    half = len(roster) // 2
    platform_members, reliability_members = roster[:half], roster[half:]

    for emp in platform_members:
        emp.organization_id, emp.team_id = default_org.id, default_team.id
    for emp in reliability_members:
        emp.organization_id, emp.team_id = default_org.id, reliability.id

    if default_team.lead_id in (None, director_employee.id):
        default_team.lead_id = platform_members[0].id
    if reliability.lead_id is None:
        reliability.lead_id = reliability_members[0].id

    await persona(
        "platform-lead@teaminsight.dev", platform_members[0].name,
        UserRoleEnum.MANAGER, platform_members[0], "Engineering Manager",
    )
    await persona(
        "reliability-lead@teaminsight.dev", reliability_members[0].name,
        UserRoleEnum.MANAGER, reliability_members[0], "Engineering Manager",
    )

    # --- Northwind: a separate org the Acme people must not be able to see ---
    northwind = (await db.execute(
        select(Organization).where(Organization.name == "Northwind Robotics")
    )).scalar_one_or_none()
    if northwind is None:
        northwind = Organization(
            name="Northwind Robotics", description="Second organization, for RBAC scoping demos"
        )
        db.add(northwind)
        await db.flush()

    controls = await team_for(northwind, "Controls Engineering", "Northwind's only team")

    nw_lead = (await db.execute(
        select(Employee).where(Employee.employee_id == "ENG-NW-001")
    )).scalar_one_or_none()
    if nw_lead is None:
        nw_lead = Employee(
            employee_id="ENG-NW-001", name="Dana Whitfield", title="Director of Engineering",
            level="L6", department="Controls", email="northwind-director@teaminsight.dev",
            location="Portland, OR", hire_date=datetime(2019, 3, 11),
        )
        db.add(nw_lead)
        await db.flush()
    nw_lead.organization_id, nw_lead.team_id = northwind.id, controls.id

    nw_member = (await db.execute(
        select(Employee).where(Employee.employee_id == "ENG-NW-002")
    )).scalar_one_or_none()
    if nw_member is None:
        nw_member = Employee(
            employee_id="ENG-NW-002", name="Theo Nakamura", title="Senior Controls Engineer",
            level="L5", department="Controls", email="theo.nakamura@northwind.dev",
            location="Portland, OR", hire_date=datetime(2021, 7, 6),
        )
        db.add(nw_member)
        await db.flush()
    nw_member.organization_id, nw_member.team_id = northwind.id, controls.id
    has_score = (await db.execute(
        select(PerformanceScore).where(PerformanceScore.employee_id == nw_member.id)
    )).scalar_one_or_none()
    if has_score is None:
        # The frontend assumes every employee carries a score.
        db.add(PerformanceScore(employee_id=nw_member.id, overall=50, trend="stable"))

    # Dual role: leads the organization *and* one of its teams.
    northwind.leader_id = nw_lead.id
    controls.lead_id = nw_lead.id
    await persona(
        "northwind-director@teaminsight.dev", nw_lead.name,
        UserRoleEnum.DIRECTOR, nw_lead, "Director of Engineering",
    )

    print(
        "Scoping personas seeded:\n"
        "  director@teaminsight.dev            org leader, Acme (2 teams)\n"
        "  platform-lead@teaminsight.dev       team leader, Automation Solution Engineering\n"
        "  reliability-lead@teaminsight.dev    team leader, Reliability Engineering\n"
        "  northwind-director@teaminsight.dev  org leader + team leader, Northwind (dual role)"
    )


if __name__ == "__main__":
    asyncio.run(main())
