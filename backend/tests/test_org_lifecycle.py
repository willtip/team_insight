"""End-to-end: stand up a new organization, add teams, staff them, appoint a leader,
and confirm the new leader's visibility follows from the chain that was just built.
"""
from sqlalchemy import select

from app.core.rbac import build_scope
from app.models.models import Employee, User, UserRoleEnum
from tests.conftest import auth


async def test_create_org_add_teams_staff_and_appoint_leader(client, db, world):
    admin = auth(world.users["root"])

    # 1. create the organization
    res = await client.post("/api/v1/organizations/", headers=admin, json={"name": "Gamma"})
    assert res.status_code == 201, res.text
    gamma = res.json()["id"]

    # 2. add two teams to it
    team_ids = {}
    for name in ("Platform", "Tooling"):
        res = await client.post(
            f"/api/v1/organizations/{gamma}/teams",
            headers=admin,
            json={"name": name, "organization_id": gamma},
        )
        assert res.status_code == 201, res.text
        team_ids[name] = res.json()["id"]

    res = await client.get(f"/api/v1/organizations/{gamma}/teams", headers=admin)
    assert {t["name"] for t in res.json()} == {"Platform", "Tooling"}

    # 3. staff each team. The organization is derived from the team, so the two can
    #    never drift apart.
    members = {}
    for name, team in (("Nina", "Platform"), ("Omar", "Platform"), ("Pia", "Tooling")):
        res = await client.post(
            "/api/v1/employees/",
            headers=admin,
            json={
                "name": name,
                "title": "Engineer",
                "email": f"{name.lower()}@example.com",
                "employee_id": f"ENG-{name}",
                "team_id": team_ids[team],
            },
        )
        assert res.status_code == 201, res.text
        assert res.json()["organization_id"] == gamma
        members[name] = res.json()["id"]

    # 4. appoint Nina as lead of Platform
    res = await client.patch(
        f"/api/v1/organizations/teams/{team_ids['Platform']}",
        headers=admin,
        json={"lead_id": members["Nina"]},
    )
    assert res.status_code == 200, res.text
    assert res.json()["lead_name"] == "Nina"

    # 5. give Nina a login, and her scope should now follow from the chain alone
    nina_user = User(email="nina@example.com", name="Nina", role=UserRoleEnum.EMPLOYEE)
    db.add(nina_user)
    await db.flush()
    nina_emp = (
        await db.execute(select(Employee).where(Employee.id == members["Nina"]))
    ).scalar_one()
    nina_emp.user_id = nina_user.id
    await db.commit()

    scope = await build_scope(nina_user, db)
    assert scope.employee_ids == frozenset({members["Nina"], members["Omar"]})
    assert members["Pia"] not in scope.employee_ids

    res = await client.get("/api/v1/employees/", headers=auth(nina_user))
    assert {e["name"] for e in res.json()} == {"Nina", "Omar"}

    # ...and she still cannot reach the neighbouring team she does not lead
    res = await client.get(f"/api/v1/employees/{members['Pia']}", headers=auth(nina_user))
    assert res.status_code == 403


async def test_org_leader_appointment_grants_whole_org(client, db, world):
    """Promoting someone to org leader widens their scope to every team beneath it."""
    admin = auth(world.users["root"])
    # Read the ids up front: the request below commits through this same session, and
    # touching an expired ORM attribute afterwards would lazy-load outside the loop.
    alpha_id = world.alpha.id
    bob_id, erin_id, ivan_id, heidi_id = (
        world.emps["bob"].id, world.emps["erin"].id,
        world.emps["ivan"].id, world.emps["heidi"].id,
    )

    # Bob currently leads only team A1.
    scope = await build_scope(world.users["bob"], db)
    assert len(scope.employee_ids) == 2

    res = await client.patch(
        f"/api/v1/organizations/{alpha_id}", headers=admin, json={"leader_id": bob_id}
    )
    assert res.status_code == 200, res.text

    scope = await build_scope(world.users["bob"], db)
    assert erin_id in scope.employee_ids
    assert ivan_id in scope.employee_ids
    # ...but still nothing in Beta.
    assert heidi_id not in scope.employee_ids


async def test_creator_can_manage_the_org_they_just_made(client, db, world):
    """A director bootstrapping an org must not be locked out of it before any
    employee has been assigned."""
    director = auth(world.users["nobody"])

    res = await client.post("/api/v1/organizations/", headers=director, json={"name": "Delta"})
    assert res.status_code == 201, res.text
    delta = res.json()["id"]

    res = await client.get("/api/v1/organizations/", headers=director)
    assert {o["name"] for o in res.json()} == {"Delta"}

    res = await client.post(
        f"/api/v1/organizations/{delta}/teams",
        headers=director,
        json={"name": "First", "organization_id": delta},
    )
    assert res.status_code == 201, res.text


async def test_non_leader_cannot_create_teams_in_someone_elses_org(client, world):
    res = await client.post(
        f"/api/v1/organizations/{world.alpha.id}/teams",
        headers=auth(world.users["grace"]),
        json={"name": "Sneaky", "organization_id": world.alpha.id},
    )
    assert res.status_code == 403


async def test_name_conflict_explains_when_the_clash_is_out_of_scope(client, db, world):
    """Names are globally unique but the org list is scoped, so a bare "already
    exists" would point at something the caller cannot see or act on."""
    admin = auth(world.users["root"])
    res = await client.post("/api/v1/organizations/", headers=admin, json={"name": "Hidden"})
    assert res.status_code == 201

    # frank leads Beta and a team in Alpha; "Hidden" is neither.
    res = await client.post(
        "/api/v1/organizations/", headers=auth(world.users["frank"]), json={"name": "Hidden"}
    )
    assert res.status_code == 409
    assert "outside your scope" in res.json()["detail"]


async def test_name_conflict_is_plain_when_the_clash_is_visible(client, world):
    """Alpha is right there in frank's org list, so the message stays terse."""
    res = await client.post(
        "/api/v1/organizations/", headers=auth(world.users["frank"]), json={"name": "Alpha"}
    )
    assert res.status_code == 409
    assert "outside your scope" not in res.json()["detail"]
