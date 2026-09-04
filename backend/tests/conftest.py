"""Async test harness: in-memory SQLite, a stub Redis, and a seeded org hierarchy.

The fixtures below build a deliberately awkward org chart — leadership grants that
cross organizations, and `User.role` values that disagree with what each person
actually leads — so that any check which quietly falls back to a role name fails
here instead of in production.
"""
import os

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key")
os.environ.setdefault("ENVIRONMENT", "development")

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.db.session import get_db
from app.main import app
from app.models.models import Base, Employee, Organization, Team, User, UserRoleEnum


class FakeRedis:
    """Enough of redis.asyncio for the token denylist and the insights cache."""

    def __init__(self):
        self.store: dict[str, str] = {}

    async def get(self, key):
        return self.store.get(key)

    async def set(self, key, value, ex=None):
        self.store[key] = value

    async def aclose(self):
        pass


@pytest.fixture(autouse=True)
def fake_redis(monkeypatch):
    fake = FakeRedis()
    # Each module imported the client by name, so the binding has to be replaced
    # everywhere it was captured rather than only at its source.
    for module in ("app.core.deps", "app.core.redis", "app.routers.insights"):
        monkeypatch.setattr(f"{module}.redis_client", fake, raising=False)
    return fake


@pytest_asyncio.fixture
async def engine():
    # StaticPool keeps every session on the one connection that holds the in-memory db.
    eng = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture
async def db(engine) -> AsyncSession:
    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with session_factory() as session:
        yield session


@pytest_asyncio.fixture
async def client(engine, db):
    async def _get_db():
        yield db

    app.dependency_overrides[get_db] = _get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


def auth(user: User) -> dict[str, str]:
    """Authorization header for a real platform JWT — the tests go in through the
    front door so the whole dependency chain runs, not just the scope helper."""
    token, _, _ = create_access_token(user.id, user.role.value)
    return {"Authorization": f"Bearer {token}"}


class World:
    """Named handles onto the seeded hierarchy."""

    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


@pytest_asyncio.fixture
async def world(db) -> World:
    """
    Org Alpha  (leader: alice)
      Team A1  (lead: bob)    -> dave
      Team A2  (lead: alice)  -> erin, carol        # alice is org leader AND team lead
      Team A3  (lead: frank)  -> ivan               # led from *outside* the org
    Org Beta   (leader: frank)
      Team B1  (lead: grace)  -> heidi

    Roles are set to disagree with the leadership on purpose: alice leads an entire
    organization while carrying role="manager", and grace leads a team while carrying
    role="employee". Anything keying off `User.role` gets the wrong answer.
    """

    def mk_user(name, role):
        return User(email=f"{name}@example.com", name=name.title(), role=role)

    users = {
        "alice": mk_user("alice", UserRoleEnum.MANAGER),
        "bob": mk_user("bob", UserRoleEnum.MANAGER),
        "carol": mk_user("carol", UserRoleEnum.EMPLOYEE),
        "dave": mk_user("dave", UserRoleEnum.EMPLOYEE),
        "erin": mk_user("erin", UserRoleEnum.EMPLOYEE),
        "frank": mk_user("frank", UserRoleEnum.DIRECTOR),
        "grace": mk_user("grace", UserRoleEnum.EMPLOYEE),
        "heidi": mk_user("heidi", UserRoleEnum.EMPLOYEE),
        "ivan": mk_user("ivan", UserRoleEnum.EMPLOYEE),
        "root": mk_user("root", UserRoleEnum.ADMIN),
        # Signed in, but with no Employee row and no grants at all.
        "nobody": mk_user("nobody", UserRoleEnum.DIRECTOR),
    }
    db.add_all(users.values())
    await db.flush()

    alpha = Organization(name="Alpha")
    beta = Organization(name="Beta")
    db.add_all([alpha, beta])
    await db.flush()

    def mk_emp(key, org, title="Engineer"):
        return Employee(
            user_id=users[key].id,
            employee_id=f"ENG-{key}",
            name=key.title(),
            title=title,
            email=f"{key}@example.com",
            organization_id=org.id,
        )

    emps = {
        k: mk_emp(k, alpha)
        for k in ("alice", "bob", "carol", "dave", "erin", "ivan")
    }
    emps.update({k: mk_emp(k, beta) for k in ("frank", "grace", "heidi")})
    db.add_all(emps.values())
    await db.flush()

    a1 = Team(organization_id=alpha.id, name="A1", lead_id=emps["bob"].id)
    a2 = Team(organization_id=alpha.id, name="A2", lead_id=emps["alice"].id)
    a3 = Team(organization_id=alpha.id, name="A3", lead_id=emps["frank"].id)
    b1 = Team(organization_id=beta.id, name="B1", lead_id=emps["grace"].id)
    db.add_all([a1, a2, a3, b1])
    await db.flush()

    alpha.leader_id = emps["alice"].id
    beta.leader_id = emps["frank"].id

    for key, team in (
        ("bob", a1), ("dave", a1),
        ("alice", a2), ("carol", a2), ("erin", a2),
        ("ivan", a3),
        ("frank", b1), ("grace", b1), ("heidi", b1),
    ):
        emps[key].team_id = team.id

    await db.commit()

    return World(
        users=users, emps=emps,
        alpha=alpha, beta=beta,
        a1=a1, a2=a2, a3=a3, b1=b1,
    )
