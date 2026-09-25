from copy import deepcopy

import pytest
from fastapi.testclient import TestClient
from tomo.context import AuthContext
from tomo.dependencies import get_auth_context, get_service_client
from tomo.main import app

from tests.conftest import OTHER_USER_ID, USER_ID
from tests.fakes.timesheet_db import FakeResponse

ADMIN_ID = "44444444-5555-4666-8777-888888888888"
LIST_PROFILES = "/api/v1/account/profiles"


class ProfilesDirectory:
    def __init__(self) -> None:
        self.rows: list[dict] = []

    def seed(self, **row) -> dict:
        stored = {
            "id": row["id"],
            "full_name": row["full_name"],
            "username": row.get("username"),
            "email": row["email"],
            "avatar_url": row.get("avatar_url"),
            "role": row["role"],
            "is_active": row["is_active"],
            "manager_id": row.get("manager_id"),
            "created_at": row["created_at"],
        }
        self.rows.append(stored)
        return deepcopy(stored)


class FakeProfilesClient:
    def __init__(self, profiles: ProfilesDirectory) -> None:
        self._profiles = profiles

    def from_(self, name: str) -> "FakeProfilesQuery":
        if name != "profiles":
            raise AssertionError(f"unexpected table {name}")
        return FakeProfilesQuery(self._profiles)


class FakeProfilesQuery:
    def __init__(self, profiles: ProfilesDirectory) -> None:
        self._profiles = profiles
        self._filters: list[tuple[str, str]] = []
        self._order: str | None = None
        self._limit: int | None = None

    def select(self, *_args) -> "FakeProfilesQuery":
        return self

    def eq(self, column: str, value) -> "FakeProfilesQuery":
        self._filters.append((column, str(value)))
        return self

    def order(self, column: str, *, desc: bool = False) -> "FakeProfilesQuery":
        self._order = column
        return self

    def limit(self, count: int) -> "FakeProfilesQuery":
        self._limit = count
        return self

    async def execute(self) -> FakeResponse:
        matched = [
            deepcopy(row)
            for row in self._profiles.rows
            if all(str(row.get(column)) == value for column, value in self._filters)
        ]
        if self._order is not None:
            matched.sort(key=lambda row: row[self._order])
        if self._limit is not None:
            matched = matched[: self._limit]
        return FakeResponse(matched)


def _override(profiles: ProfilesDirectory, user_id: str) -> None:
    fake = FakeProfilesClient(profiles)

    async def _auth_context() -> AuthContext:
        return AuthContext(client=fake, current_user_id=user_id, token="test-token")

    async def _service_client() -> FakeProfilesClient:
        return fake

    app.dependency_overrides[get_auth_context] = _auth_context
    app.dependency_overrides[get_service_client] = _service_client


@pytest.fixture
def profiles() -> ProfilesDirectory:
    directory = ProfilesDirectory()
    directory.seed(
        id=OTHER_USER_ID,
        full_name="Zoe Lead",
        username="zoe",
        email="zoe@tomo.test",
        role="lead",
        is_active=False,
        created_at="2024-03-15T00:00:00+00:00",
    )
    directory.seed(
        id=USER_ID,
        full_name="Ana Cruz",
        username="ana",
        email="ana@tomo.test",
        role="ic",
        is_active=True,
        manager_id=OTHER_USER_ID,
        created_at="2025-07-22T00:00:00+00:00",
    )
    directory.seed(
        id=ADMIN_ID,
        full_name="Bea Admin",
        username=None,
        email="bea@tomo.test",
        role="support",
        is_active=True,
        created_at="2023-11-05T00:00:00+00:00",
    )
    return directory


@pytest.fixture
def as_profile(profiles: ProfilesDirectory):
    with TestClient(app) as client:

        def _as(user_id: str) -> TestClient:
            _override(profiles, user_id)
            return client

        yield _as
    app.dependency_overrides.clear()


class TestListProfiles:
    def test_admin_sees_every_profile_by_name(self, as_profile) -> None:
        response = as_profile(ADMIN_ID).get(LIST_PROFILES)

        assert response.status_code == 200
        assert response.json() == [
            {
                "id": USER_ID,
                "full_name": "Ana Cruz",
                "username": "ana",
                "email": "ana@tomo.test",
                "avatar_url": None,
                "role": "ic",
                "is_active": True,
                "job_title": None,
                "bio": None,
                "phone": None,
                "manager_id": OTHER_USER_ID,
                "created_at": "2025-07-22T00:00:00Z",
            },
            {
                "id": ADMIN_ID,
                "full_name": "Bea Admin",
                "username": None,
                "email": "bea@tomo.test",
                "avatar_url": None,
                "role": "support",
                "is_active": True,
                "job_title": None,
                "bio": None,
                "phone": None,
                "manager_id": None,
                "created_at": "2023-11-05T00:00:00Z",
            },
            {
                "id": OTHER_USER_ID,
                "full_name": "Zoe Lead",
                "username": "zoe",
                "email": "zoe@tomo.test",
                "avatar_url": None,
                "role": "lead",
                "is_active": False,
                "job_title": None,
                "bio": None,
                "phone": None,
                "manager_id": None,
                "created_at": "2024-03-15T00:00:00Z",
            },
        ]

    def test_non_admin_is_forbidden(self, as_profile) -> None:
        response = as_profile(USER_ID).get(LIST_PROFILES)

        assert response.status_code == 403
        assert response.json()["detail"] == (
            "You do not have permission to perform this action"
        )
