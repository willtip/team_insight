"""Org/Team scoping: who can see whom, and what a direct API call gets when they can't.

The world under test (see conftest) is arranged so that leadership and `User.role`
disagree — alice leads all of Alpha with role="manager", grace leads a team with
role="employee" — so a check that reads a role name instead of walking the chain
produces the wrong answer here.
"""
import pytest

from app.core.rbac import build_scope
from tests.conftest import auth


def names(scope, world) -> set[str]:
    """Scope employee ids back to people, so failures read as names not uuids."""
    by_id = {e.id: k for k, e in world.emps.items()}
    return {by_id[i] for i in scope.employee_ids if i in by_id}


# --------------------------------------------------------------------------
# The scope calculation itself
# --------------------------------------------------------------------------

async def test_org_leader_sees_whole_org_not_other_orgs(db, world):
    scope = await build_scope(world.users["alice"], db)
    # Everyone whose organization is Alpha, across all three of its teams.
    assert names(scope, world) == {"alice", "bob", "carol", "dave", "erin", "ivan"}
    assert "heidi" not in names(scope, world)
    assert "grace" not in names(scope, world)


async def test_team_leader_sees_only_their_team(db, world):
    scope = await build_scope(world.users["bob"], db)
    assert names(scope, world) == {"bob", "dave"}


async def test_team_leader_role_name_is_irrelevant(db, world):
    """Grace carries role="employee" but leads B1, and must see her team anyway.

    Frank is included because his own employee record sits on B1 — leading Beta does
    not exempt him from being a member of a team someone else leads.
    """
    assert world.users["grace"].role.value == "employee"
    scope = await build_scope(world.users["grace"], db)
    assert names(scope, world) == {"grace", "heidi", "frank"}


async def test_org_leader_role_name_is_irrelevant(db, world):
    """Alice carries role="manager" but leads an organization."""
    assert world.users["alice"].role.value == "manager"
    scope = await build_scope(world.users["alice"], db)
    assert world.emps["ivan"].id in scope.employee_ids


async def test_plain_member_sees_only_themselves(db, world):
    scope = await build_scope(world.users["carol"], db)
    assert names(scope, world) == {"carol"}


async def test_user_with_no_employee_record_sees_nothing(db, world):
    """A NULL leader_id must not compile to `IS NULL` and match unassigned rows."""
    scope = await build_scope(world.users["nobody"], db)
    assert scope.employee_ids == frozenset()
    assert scope.visible_org_ids == frozenset()


async def test_admin_is_unrestricted(db, world):
    scope = await build_scope(world.users["root"], db)
    assert scope.unrestricted


# --------------------------------------------------------------------------
# Dual-role: the union has to be computed, not special-cased
# --------------------------------------------------------------------------

async def test_dual_role_subsumed_grant_adds_nothing(db, world):
    """Alice leads Alpha *and* leads team A2 inside it.

    The team grant is a strict subset of the org grant, so the result must be exactly
    the org scope — no duplicates, no narrowing to just A2.
    """
    scope = await build_scope(world.users["alice"], db)
    assert names(scope, world) == {"alice", "bob", "carol", "dave", "erin", "ivan"}
    # A set, so "no duplicate permission results" is structural.
    assert len(scope.employee_ids) == 6
    assert world.a2.id in scope.led_team_ids
    assert world.alpha.id in scope.led_org_ids


async def test_dual_role_additive_grant_unions_across_orgs(db, world):
    """Frank leads org Beta *and* team A3, which lives in Alpha.

    This is the case that catches an if/elif on role: the org branch alone would drop
    ivan, the team branch alone would drop all of Beta. Only a union gets both — and
    it must still not pull in the rest of Alpha.
    """
    scope = await build_scope(world.users["frank"], db)
    assert names(scope, world) == {"frank", "grace", "heidi", "ivan"}
    for outsider in ("alice", "bob", "carol", "dave", "erin"):
        assert world.emps[outsider].id not in scope.employee_ids


async def test_dual_role_scope_is_order_independent(db, world):
    """Recomputing yields the same set — no accumulation across calls."""
    first = await build_scope(world.users["frank"], db)
    second = await build_scope(world.users["frank"], db)
    assert first.employee_ids == second.employee_ids


# --------------------------------------------------------------------------
# Enforcement over HTTP: a direct call must 403, not 200-with-nothing
# --------------------------------------------------------------------------

async def test_member_list_is_scoped(client, world):
    res = await client.get("/api/v1/employees/", headers=auth(world.users["bob"]))
    assert res.status_code == 200
    assert {e["name"] for e in res.json()} == {"Bob", "Dave"}


async def test_org_leader_member_list_covers_all_teams(client, world):
    res = await client.get("/api/v1/employees/", headers=auth(world.users["alice"]))
    assert res.status_code == 200
    assert {e["name"] for e in res.json()} == {
        "Alice", "Bob", "Carol", "Dave", "Erin", "Ivan"
    }


async def test_direct_fetch_of_out_of_scope_member_is_403(client, world):
    res = await client.get(
        f"/api/v1/employees/{world.emps['heidi'].id}", headers=auth(world.users["bob"])
    )
    assert res.status_code == 403


async def test_out_of_scope_member_is_403_not_404(client, world):
    """403 rather than 404: the record exists, the caller just may not have it. A 404
    here would also be an existence oracle."""
    res = await client.get(
        f"/api/v1/employees/{world.emps['erin'].id}", headers=auth(world.users["grace"])
    )
    assert res.status_code == 403


@pytest.mark.parametrize(
    "path",
    [
        "/api/v1/goals/?employee_id={eid}",
        "/api/v1/projects/?employee_id={eid}",
        "/api/v1/one-on-ones/?employee_id={eid}",
        "/api/v1/notes/?employee_id={eid}",
        "/api/v1/skills/{eid}",
        "/api/v1/employees/{eid}/development-plan",
        "/api/v1/employees/{eid}/accomplishments",
        "/api/v1/employees/{eid}/performance",
    ],
)
async def test_every_profile_surface_403s_out_of_scope(client, world, path):
    """Each tab of a member profile is its own endpoint; scoping one is not enough."""
    url = path.format(eid=world.emps["heidi"].id)
    res = await client.get(url, headers=auth(world.users["bob"]))
    assert res.status_code == 403, f"{url} returned {res.status_code}"


async def test_filtered_list_is_403_not_empty_200(client, world):
    """Filtering to an out-of-scope member must fail loudly. An empty 200 would let a
    caller probe which ids exist by watching for the shape of the response."""
    res = await client.get(
        f"/api/v1/goals/?employee_id={world.emps['heidi'].id}",
        headers=auth(world.users["bob"]),
    )
    assert res.status_code == 403


async def test_cannot_enumerate_another_orgs_teams(client, world):
    res = await client.get(
        f"/api/v1/organizations/{world.beta.id}/teams", headers=auth(world.users["alice"])
    )
    assert res.status_code == 403


async def test_org_list_is_scoped_to_visible_orgs(client, world):
    res = await client.get("/api/v1/organizations/", headers=auth(world.users["alice"]))
    assert res.status_code == 200
    assert {o["name"] for o in res.json()} == {"Alpha"}


async def test_dual_role_org_list_includes_both_orgs(client, world):
    """Frank leads Beta and a team in Alpha, so both are selectable — but Alpha only
    down to the team he actually leads."""
    res = await client.get("/api/v1/organizations/", headers=auth(world.users["frank"]))
    assert {o["name"] for o in res.json()} == {"Alpha", "Beta"}

    teams = await client.get(
        f"/api/v1/organizations/{world.alpha.id}/teams", headers=auth(world.users["frank"])
    )
    assert teams.status_code == 200
    assert {t["name"] for t in teams.json()} == {"A3"}


async def test_scoped_member_list_by_team_is_403_out_of_scope(client, world):
    res = await client.get(
        f"/api/v1/employees/?team_id={world.b1.id}", headers=auth(world.users["bob"])
    )
    assert res.status_code == 403


async def test_scoped_member_list_by_team_in_scope(client, world):
    res = await client.get(
        f"/api/v1/employees/?team_id={world.a1.id}", headers=auth(world.users["alice"])
    )
    assert res.status_code == 200
    assert {e["name"] for e in res.json()} == {"Bob", "Dave"}


async def test_unauthenticated_call_is_401(client, world):
    res = await client.get(f"/api/v1/employees/{world.emps['dave'].id}")
    assert res.status_code == 401


# --------------------------------------------------------------------------
# Writes
# --------------------------------------------------------------------------

async def test_cannot_write_a_note_about_an_out_of_scope_member(client, world):
    res = await client.post(
        "/api/v1/notes/",
        headers=auth(world.users["bob"]),
        json={
            "employee_id": world.emps["heidi"].id,
            "category": "Coaching",
            "title": "x",
            "content": "y",
        },
    )
    assert res.status_code == 403


async def test_cannot_reassign_a_member_into_another_org(client, world):
    """The escalation path: moving someone into an org you do not lead."""
    res = await client.patch(
        f"/api/v1/employees/{world.emps['dave'].id}",
        headers=auth(world.users["bob"]),
        json={"organization_id": world.beta.id},
    )
    assert res.status_code == 403


async def test_org_team_pair_must_be_consistent(client, world):
    """A team in Alpha cannot be paired with Beta as the organization."""
    res = await client.patch(
        f"/api/v1/employees/{world.emps['ivan'].id}",
        headers=auth(world.users["root"]),
        json={"team_id": world.a1.id, "organization_id": world.beta.id},
    )
    assert res.status_code == 422


async def test_reassignment_derives_org_from_team(client, world):
    res = await client.patch(
        f"/api/v1/employees/{world.emps['ivan'].id}",
        headers=auth(world.users["alice"]),
        json={"team_id": world.a1.id},
    )
    assert res.status_code == 200
    assert res.json()["team_id"] == world.a1.id
    assert res.json()["organization_id"] == world.alpha.id
