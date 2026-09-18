from datetime import datetime
from zoneinfo import ZoneInfo

import pytest
from fastapi.testclient import TestClient
from tomo.context import AuthContext
from tomo.dependencies import get_auth_context
from tomo.main import app

from tests.conftest import OTHER_USER_ID, USER_ID
from tests.fakes.leave_db import (
    FakeLeaveClient,
    LeaveRequestsTable,
    ProfilesTable,
)

MANILA = ZoneInfo("Asia/Manila")
FILE_LEAVE = "/api/v1/leave"
TODAY = datetime(2026, 9, 18, 10, 0, tzinfo=MANILA)


def _payload(
    *,
    date: str = "2026-09-18",
    leave_type: str = "vl",
    coverage: str = "whole",
    reason: str = "Family trip",
) -> dict:
    return {
        "date": date,
        "leave_type": leave_type,
        "coverage": coverage,
        "reason": reason,
    }


def _row(table: ProfilesTable, profile_id: str) -> dict:
    return next(row for row in table.rows if row["id"] == profile_id)


@pytest.fixture
def profiles() -> ProfilesTable:
    table = ProfilesTable()
    table.seed(id=OTHER_USER_ID, role="lead", is_active=True)
    table.seed(id=USER_ID, role="ic", is_active=True, manager_id=OTHER_USER_ID)
    return table


@pytest.fixture
def leaves() -> LeaveRequestsTable:
    return LeaveRequestsTable()


@pytest.fixture
def leave_api(profiles: ProfilesTable, leaves: LeaveRequestsTable):
    async def _auth_context() -> AuthContext:
        return AuthContext(
            client=FakeLeaveClient(profiles, leaves),
            current_user_id=USER_ID,
            token="test-token",
        )

    app.dependency_overrides[get_auth_context] = _auth_context
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture
def freeze_leave(monkeypatch):
    def _freeze(when: datetime) -> datetime:
        class FrozenDateTime(datetime):
            @classmethod
            def now(cls, tz=None):
                return when.astimezone(tz) if tz is not None else when

        monkeypatch.setattr("tomo.leave.service.datetime", FrozenDateTime)
        return when

    return _freeze


class TestUnauthenticated:
    def test_file_leave_requires_auth(self) -> None:
        response = TestClient(app).post(FILE_LEAVE, json=_payload())
        assert response.status_code == 401


class TestFileLeave:
    def test_files_pending_leave_with_manager_copied(
        self, leave_api, freeze_leave
    ) -> None:
        freeze_leave(TODAY)

        response = leave_api.post(FILE_LEAVE, json=_payload())

        assert response.status_code == 200
        body = response.json()
        assert body["profile_id"] == USER_ID
        assert body["manager_id"] == OTHER_USER_ID
        assert body["date"] == "2026-09-18"
        assert body["leave_type"] == "vl"
        assert body["coverage"] == "whole"
        assert body["reason"] == "Family trip"
        assert body["status"] == "pending"
        assert body["decided_by"] is None

    def test_files_half_day(self, leave_api, freeze_leave) -> None:
        freeze_leave(TODAY)

        response = leave_api.post(
            FILE_LEAVE, json=_payload(coverage="half", leave_type="sl")
        )

        assert response.status_code == 200
        assert response.json()["coverage"] == "half"
        assert response.json()["leave_type"] == "sl"

    def test_allows_yesterday(self, leave_api, freeze_leave) -> None:
        freeze_leave(TODAY)

        response = leave_api.post(FILE_LEAVE, json=_payload(date="2026-09-17"))

        assert response.status_code == 200
        assert response.json()["date"] == "2026-09-17"

    def test_rejects_date_before_yesterday(self, leave_api, freeze_leave) -> None:
        freeze_leave(TODAY)

        response = leave_api.post(FILE_LEAVE, json=_payload(date="2026-09-16"))

        assert response.status_code == 400
        assert response.json()["detail"] == "Date cannot be earlier than yesterday"

    def test_rejects_missing_manager(
        self, leave_api, profiles, freeze_leave
    ) -> None:
        freeze_leave(TODAY)
        _row(profiles, USER_ID)["manager_id"] = None

        response = leave_api.post(FILE_LEAVE, json=_payload())

        assert response.status_code == 400
        assert (
            response.json()["detail"]
            == "An active manager is required to file a leave request"
        )

    def test_rejects_inactive_manager(
        self, leave_api, profiles, freeze_leave
    ) -> None:
        freeze_leave(TODAY)
        _row(profiles, OTHER_USER_ID)["is_active"] = False

        response = leave_api.post(FILE_LEAVE, json=_payload())

        assert response.status_code == 400
        assert (
            response.json()["detail"]
            == "An active manager is required to file a leave request"
        )

    def test_rejects_non_manager_role(
        self, leave_api, profiles, freeze_leave
    ) -> None:
        freeze_leave(TODAY)
        _row(profiles, OTHER_USER_ID)["role"] = "ic"

        response = leave_api.post(FILE_LEAVE, json=_payload())

        assert response.status_code == 400
        assert (
            response.json()["detail"]
            == "An active manager is required to file a leave request"
        )

    def test_conflict_when_pending_exists(
        self, leave_api, leaves, freeze_leave
    ) -> None:
        freeze_leave(TODAY)
        leaves.seed(
            profile_id=USER_ID,
            date="2026-09-18",
            leave_type="vl",
            coverage="whole",
            reason="Already filed",
            status="pending",
            manager_id=OTHER_USER_ID,
        )

        response = leave_api.post(FILE_LEAVE, json=_payload())

        assert response.status_code == 409
        assert (
            response.json()["detail"]
            == "A pending or approved leave request already exists for this date"
        )

    def test_conflict_when_approved_exists(
        self, leave_api, leaves, freeze_leave
    ) -> None:
        freeze_leave(TODAY)
        leaves.seed(
            profile_id=USER_ID,
            date="2026-09-18",
            leave_type="vl",
            coverage="whole",
            reason="Already approved",
            status="approved",
            manager_id=OTHER_USER_ID,
        )

        response = leave_api.post(FILE_LEAVE, json=_payload())

        assert response.status_code == 409

    def test_allows_refile_after_cancelled(
        self, leave_api, leaves, freeze_leave
    ) -> None:
        freeze_leave(TODAY)
        leaves.seed(
            profile_id=USER_ID,
            date="2026-09-18",
            leave_type="vl",
            coverage="whole",
            reason="Changed plans",
            status="cancelled",
            manager_id=OTHER_USER_ID,
        )

        response = leave_api.post(FILE_LEAVE, json=_payload())

        assert response.status_code == 200
        assert response.json()["status"] == "pending"

    def test_ignores_another_users_leave_on_same_date(
        self, leave_api, leaves, freeze_leave
    ) -> None:
        freeze_leave(TODAY)
        leaves.seed(
            profile_id=OTHER_USER_ID,
            date="2026-09-18",
            leave_type="vl",
            coverage="whole",
            reason="Manager is off",
            status="pending",
            manager_id=USER_ID,
        )

        response = leave_api.post(FILE_LEAVE, json=_payload())

        assert response.status_code == 200
        assert response.json()["profile_id"] == USER_ID
