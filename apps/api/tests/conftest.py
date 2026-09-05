from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from tomo.context import AuthContext
from tomo.core.rate_limiter import limiter
from tomo.dependencies import get_auth_context
from tomo.main import app

from tests.fakes.timesheet_db import FakeTimesheetClient, TimesheetTable

USER_ID = "07fc3c69-f6c6-4837-af29-7d83f369c396"
OTHER_USER_ID = "11111111-2222-4333-8444-555555555555"


@pytest.fixture(autouse=True)
def _disable_rate_limiter():
    limiter.enabled = False
    yield
    limiter.enabled = True


@pytest.fixture
def table() -> TimesheetTable:
    return TimesheetTable()


@pytest.fixture
def api(table: TimesheetTable):
    async def _auth_context() -> AuthContext:
        return AuthContext(
            client=FakeTimesheetClient(table),
            current_user_id=USER_ID,
            token="test-token",
        )

    app.dependency_overrides[get_auth_context] = _auth_context
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture
def freeze_manila(monkeypatch):
    def _freeze(when: datetime) -> datetime:
        class FrozenDateTime(datetime):
            @classmethod
            def now(cls, tz=None):
                return when.astimezone(tz) if tz is not None else when

        monkeypatch.setattr("tomo.timesheet.service.datetime", FrozenDateTime)
        return when

    return _freeze
