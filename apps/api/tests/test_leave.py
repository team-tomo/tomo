from datetime import datetime
from uuid import uuid4
from zoneinfo import ZoneInfo

import pytest
from fastapi.testclient import TestClient
from tomo.context import AuthContext
from tomo.dependencies import get_auth_context, get_service_client
from tomo.main import app

from tests.conftest import OTHER_USER_ID, USER_ID
from tests.fakes.leave_db import (
    FakeLeaveClient,
    LeaveRequestsTable,
    ProfilesTable,
)

MANILA = ZoneInfo("Asia/Manila")
FILE_LEAVE = "/api/v1/leave"
LIST_LEAVE = "/api/v1/leave"
INBOX_LEAVE = "/api/v1/leave/inbox"
TODAY = datetime(2026, 9, 18, 10, 0, tzinfo=MANILA)
STRANGER_ID = "22222222-3333-4444-8555-666666666666"
OTHER_MANAGER_ID = "33333333-4444-4555-8666-777777777777"


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


def _seed_leave(
    leaves: LeaveRequestsTable,
    *,
    profile_id: str = USER_ID,
    date: str,
    reason: str = "Family trip",
    status: str = "pending",
    manager_id: str = OTHER_USER_ID,
) -> dict:
    return leaves.seed(
        profile_id=profile_id,
        date=date,
        leave_type="vl",
        coverage="whole",
        reason=reason,
        status=status,
        manager_id=manager_id,
    )


def _override_leave_client(
    profiles: ProfilesTable, leaves: LeaveRequestsTable, user_id: str
) -> None:
    fake = FakeLeaveClient(profiles, leaves)

    async def _auth_context() -> AuthContext:
        return AuthContext(
            client=fake,
            current_user_id=user_id,
            token="test-token",
        )

    async def _service_client() -> FakeLeaveClient:
        return fake

    app.dependency_overrides[get_auth_context] = _auth_context
    app.dependency_overrides[get_service_client] = _service_client


@pytest.fixture
def profiles() -> ProfilesTable:
    table = ProfilesTable()
    table.seed(id=OTHER_USER_ID, role="lead", is_active=True)
    table.seed(id=USER_ID, role="ic", is_active=True, manager_id=OTHER_USER_ID)
    table.seed(id=OTHER_MANAGER_ID, role="executive", is_active=True)
    table.seed(id=STRANGER_ID, role="ic", is_active=True)
    return table


@pytest.fixture
def leaves() -> LeaveRequestsTable:
    return LeaveRequestsTable()


@pytest.fixture
def leave_api(profiles: ProfilesTable, leaves: LeaveRequestsTable):
    _override_leave_client(profiles, leaves, USER_ID)
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture
def manager_api(profiles: ProfilesTable, leaves: LeaveRequestsTable):
    _override_leave_client(profiles, leaves, OTHER_USER_ID)
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture
def other_manager_api(profiles: ProfilesTable, leaves: LeaveRequestsTable):
    _override_leave_client(profiles, leaves, OTHER_MANAGER_ID)
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture
def stranger_api(profiles: ProfilesTable, leaves: LeaveRequestsTable):
    _override_leave_client(profiles, leaves, STRANGER_ID)
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

    def test_list_leave_requires_auth(self) -> None:
        response = TestClient(app).get(LIST_LEAVE)
        assert response.status_code == 401

    def test_get_leave_requires_auth(self) -> None:
        response = TestClient(app).get(f"{FILE_LEAVE}/{uuid4()}")
        assert response.status_code == 401

    def test_cancel_leave_requires_auth(self) -> None:
        response = TestClient(app).post(f"{FILE_LEAVE}/{uuid4()}/cancel")
        assert response.status_code == 401

    def test_inbox_requires_auth(self) -> None:
        response = TestClient(app).get(INBOX_LEAVE)
        assert response.status_code == 401

    def test_approve_leave_requires_auth(self) -> None:
        response = TestClient(app).post(f"{FILE_LEAVE}/{uuid4()}/approve")
        assert response.status_code == 401

    def test_reject_leave_requires_auth(self) -> None:
        response = TestClient(app).post(f"{FILE_LEAVE}/{uuid4()}/reject")
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


class TestListLeave:
    def test_empty_list(self, leave_api) -> None:
        response = leave_api.get(LIST_LEAVE)

        assert response.status_code == 200
        assert response.json() == []

    def test_returns_own_rows_newest_date_first(self, leave_api, leaves) -> None:
        _seed_leave(leaves, date="2026-09-10", reason="Earlier")
        _seed_leave(leaves, date="2026-09-18", reason="Later")

        response = leave_api.get(LIST_LEAVE)

        assert response.status_code == 200
        body = response.json()
        assert [row["date"] for row in body] == ["2026-09-18", "2026-09-10"]
        assert [row["reason"] for row in body] == ["Later", "Earlier"]

    def test_omits_another_users_rows(self, leave_api, leaves) -> None:
        _seed_leave(leaves, date="2026-09-18", reason="Mine")
        _seed_leave(
            leaves,
            profile_id=OTHER_USER_ID,
            date="2026-09-18",
            reason="Theirs",
            manager_id=USER_ID,
        )

        response = leave_api.get(LIST_LEAVE)

        assert response.status_code == 200
        body = response.json()
        assert len(body) == 1
        assert body[0]["reason"] == "Mine"
        assert body[0]["profile_id"] == USER_ID


class TestGetLeave:
    def test_filer_can_view(self, leave_api, leaves) -> None:
        row = _seed_leave(leaves, date="2026-09-18")

        response = leave_api.get(f"{FILE_LEAVE}/{row['id']}")

        assert response.status_code == 200
        assert response.json()["id"] == row["id"]
        assert response.json()["profile_id"] == USER_ID

    def test_manager_can_view(self, manager_api, leaves) -> None:
        row = _seed_leave(leaves, date="2026-09-18")

        response = manager_api.get(f"{FILE_LEAVE}/{row['id']}")

        assert response.status_code == 200
        assert response.json()["id"] == row["id"]
        assert response.json()["manager_id"] == OTHER_USER_ID

    def test_stranger_cannot_view(self, stranger_api, leaves) -> None:
        row = _seed_leave(leaves, date="2026-09-18")

        response = stranger_api.get(f"{FILE_LEAVE}/{row['id']}")

        assert response.status_code == 403
        assert (
            response.json()["detail"]
            == "You are not authorized to view this leave request"
        )

    def test_unknown_id_is_not_found(self, leave_api) -> None:
        response = leave_api.get(f"{FILE_LEAVE}/{uuid4()}")

        assert response.status_code == 404
        assert response.json()["detail"] == "Leave request not found"


class TestCancelLeave:
    def test_filer_cancels_pending(self, leave_api, leaves) -> None:
        row = _seed_leave(leaves, date="2026-09-18")

        response = leave_api.post(f"{FILE_LEAVE}/{row['id']}/cancel")

        assert response.status_code == 200
        assert response.json()["status"] == "cancelled"
        assert response.json()["id"] == row["id"]

    def test_filer_cannot_cancel_approved(self, leave_api, leaves) -> None:
        row = _seed_leave(leaves, date="2026-09-18", status="approved")

        response = leave_api.post(f"{FILE_LEAVE}/{row['id']}/cancel")

        assert response.status_code == 400
        assert response.json()["detail"] == "Only pending leave requests can be cancelled"

    def test_manager_cannot_cancel(self, manager_api, leaves) -> None:
        row = _seed_leave(leaves, date="2026-09-18")

        response = manager_api.post(f"{FILE_LEAVE}/{row['id']}/cancel")

        assert response.status_code == 403
        assert response.json()["detail"] == "Only filer can cancel a leave request"

    def test_stranger_cannot_cancel(self, stranger_api, leaves) -> None:
        row = _seed_leave(leaves, date="2026-09-18")

        response = stranger_api.post(f"{FILE_LEAVE}/{row['id']}/cancel")

        assert response.status_code == 404
        assert response.json()["detail"] == "Leave request not found"

    def test_unknown_id_is_not_found(self, leave_api) -> None:
        response = leave_api.post(f"{FILE_LEAVE}/{uuid4()}/cancel")

        assert response.status_code == 404
        assert response.json()["detail"] == "Leave request not found"


class TestLeaveInbox:
    def test_empty_when_nothing_to_decide(self, manager_api) -> None:
        response = manager_api.get(INBOX_LEAVE)

        assert response.status_code == 200
        assert response.json() == []

    def test_ic_inbox_is_empty(self, leave_api, leaves) -> None:
        _seed_leave(leaves, date="2026-09-18")

        response = leave_api.get(INBOX_LEAVE)

        assert response.status_code == 200
        assert response.json() == []

    def test_assigned_manager_sees_pending(self, manager_api, leaves) -> None:
        row = _seed_leave(leaves, date="2026-09-18")

        response = manager_api.get(INBOX_LEAVE)

        assert response.status_code == 200
        body = response.json()
        assert len(body) == 1
        assert body[0]["id"] == row["id"]
        assert body[0]["status"] == "pending"

    def test_omits_already_decided(self, manager_api, leaves) -> None:
        _seed_leave(leaves, date="2026-09-10", status="approved")
        pending = _seed_leave(leaves, date="2026-09-18")

        response = manager_api.get(INBOX_LEAVE)

        assert response.status_code == 200
        body = response.json()
        assert [row["id"] for row in body] == [pending["id"]]

    def test_omits_another_managers_pending_while_they_are_active(
        self, other_manager_api, leaves
    ) -> None:
        _seed_leave(leaves, date="2026-09-18")

        response = other_manager_api.get(INBOX_LEAVE)

        assert response.status_code == 200
        assert response.json() == []

    def test_includes_pending_when_assigned_manager_is_inactive(
        self, other_manager_api, profiles, leaves
    ) -> None:
        _row(profiles, OTHER_USER_ID)["is_active"] = False
        row = _seed_leave(leaves, date="2026-09-18")

        response = other_manager_api.get(INBOX_LEAVE)

        assert response.status_code == 200
        body = response.json()
        assert len(body) == 1
        assert body[0]["id"] == row["id"]

    def test_omits_own_filings(self, manager_api, leaves) -> None:
        _seed_leave(
            leaves,
            profile_id=OTHER_USER_ID,
            date="2026-09-18",
            manager_id=OTHER_MANAGER_ID,
        )

        response = manager_api.get(INBOX_LEAVE)

        assert response.status_code == 200
        assert response.json() == []

    def test_newest_date_first(self, manager_api, leaves) -> None:
        _seed_leave(leaves, date="2026-09-10", reason="Earlier")
        _seed_leave(leaves, date="2026-09-18", reason="Later")

        response = manager_api.get(INBOX_LEAVE)

        assert response.status_code == 200
        assert [row["date"] for row in response.json()] == ["2026-09-18", "2026-09-10"]


class TestDecideLeave:
    def test_assigned_manager_approves(self, manager_api, leaves) -> None:
        row = _seed_leave(leaves, date="2026-09-18")

        response = manager_api.post(f"{FILE_LEAVE}/{row['id']}/approve")

        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "approved"
        assert body["decided_by"] == OTHER_USER_ID
        assert body["decided_at"] is not None

    def test_assigned_manager_rejects(self, manager_api, leaves) -> None:
        row = _seed_leave(leaves, date="2026-09-18")

        response = manager_api.post(f"{FILE_LEAVE}/{row['id']}/reject")

        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "rejected"
        assert body["decided_by"] == OTHER_USER_ID
        assert body["decided_at"] is not None

    def test_filer_cannot_decide(self, leave_api, leaves) -> None:
        row = _seed_leave(leaves, date="2026-09-18")

        response = leave_api.post(f"{FILE_LEAVE}/{row['id']}/approve")

        assert response.status_code == 403
        assert (
            response.json()["detail"]
            == "You are not authorized to decide this leave request"
        )

    def test_other_manager_cannot_decide_while_assigned_is_active(
        self, other_manager_api, leaves
    ) -> None:
        row = _seed_leave(leaves, date="2026-09-18")

        response = other_manager_api.post(f"{FILE_LEAVE}/{row['id']}/approve")

        assert response.status_code == 404
        assert response.json()["detail"] == "Leave request not found"

    def test_other_manager_approves_when_assigned_is_inactive(
        self, other_manager_api, profiles, leaves
    ) -> None:
        _row(profiles, OTHER_USER_ID)["is_active"] = False
        row = _seed_leave(leaves, date="2026-09-18")

        response = other_manager_api.post(f"{FILE_LEAVE}/{row['id']}/approve")

        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "approved"
        assert body["decided_by"] == OTHER_MANAGER_ID

    def test_other_manager_rejects_when_assigned_is_inactive(
        self, other_manager_api, profiles, leaves
    ) -> None:
        _row(profiles, OTHER_USER_ID)["is_active"] = False
        row = _seed_leave(leaves, date="2026-09-18")

        response = other_manager_api.post(f"{FILE_LEAVE}/{row['id']}/reject")

        assert response.status_code == 200
        assert response.json()["status"] == "rejected"
        assert response.json()["decided_by"] == OTHER_MANAGER_ID

    def test_cannot_decide_already_approved(self, manager_api, leaves) -> None:
        row = _seed_leave(leaves, date="2026-09-18", status="approved")

        response = manager_api.post(f"{FILE_LEAVE}/{row['id']}/approve")

        assert response.status_code == 400
        assert (
            response.json()["detail"]
            == "Only a pending leave request can be decided"
        )

    def test_cannot_decide_cancelled(self, manager_api, leaves) -> None:
        row = _seed_leave(leaves, date="2026-09-18", status="cancelled")

        response = manager_api.post(f"{FILE_LEAVE}/{row['id']}/reject")

        assert response.status_code == 400
        assert (
            response.json()["detail"]
            == "Only a pending leave request can be decided"
        )

    def test_stranger_cannot_decide(self, stranger_api, leaves) -> None:
        row = _seed_leave(leaves, date="2026-09-18")

        response = stranger_api.post(f"{FILE_LEAVE}/{row['id']}/approve")

        assert response.status_code == 404
        assert response.json()["detail"] == "Leave request not found"

    def test_inactive_assigned_manager_cannot_decide(
        self, manager_api, profiles, leaves
    ) -> None:
        _row(profiles, OTHER_USER_ID)["is_active"] = False
        row = _seed_leave(leaves, date="2026-09-18")

        response = manager_api.post(f"{FILE_LEAVE}/{row['id']}/approve")

        assert response.status_code == 403
        assert (
            response.json()["detail"]
            == "You are not authorized to decide this leave request"
        )

    def test_unknown_id_is_not_found(self, manager_api) -> None:
        response = manager_api.post(f"{FILE_LEAVE}/{uuid4()}/approve")

        assert response.status_code == 404
        assert response.json()["detail"] == "Leave request not found"

    def test_second_decision_is_rejected(self, manager_api, leaves) -> None:
        row = _seed_leave(leaves, date="2026-09-18")

        first = manager_api.post(f"{FILE_LEAVE}/{row['id']}/approve")
        second = manager_api.post(f"{FILE_LEAVE}/{row['id']}/reject")

        assert first.status_code == 200
        assert second.status_code == 400
        assert (
            second.json()["detail"]
            == "Only a pending leave request can be decided"
        )
