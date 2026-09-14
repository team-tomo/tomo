from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi.testclient import TestClient
from tomo.main import app

from tests.conftest import OTHER_USER_ID, USER_ID

MANILA = ZoneInfo("Asia/Manila")
TODAY_STATUS = "/api/v1/timesheet/today-status"
CLOCK_IN = "/api/v1/timesheet/clock-in"
CLOCK_OUT = "/api/v1/timesheet/clock-out"
ATTENDANCE = "/api/v1/timesheet/attendance"
SUMMARY = "/api/v1/timesheet/attendance/summary"

ON_TIME = datetime(2026, 9, 6, 8, 59, 59, tzinfo=MANILA)
AT_NINE = datetime(2026, 9, 6, 9, 0, 0, tzinfo=MANILA)
JUST_LATE = datetime(2026, 9, 6, 9, 0, 1, tzinfo=MANILA)
MID_MORNING = datetime(2026, 9, 6, 10, 30, 0, tzinfo=MANILA)
# 00:30 in Manila is still 16:30 the previous day in UTC.
AFTER_MIDNIGHT_MANILA = datetime(2026, 9, 6, 0, 30, 0, tzinfo=MANILA)


def _iso(value: datetime) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _attendance(
    table,
    date: str,
    *,
    user_id: str = USER_ID,
    is_late: bool = False,
    time_out: str | None = None,
):
    return table.seed(
        user_id=user_id,
        date=date,
        time_in=f"{date}T00:00:00+00:00",
        time_out=time_out,
        is_late=is_late,
    )


class TestUnauthenticated:
    def test_today_status_requires_auth(self) -> None:
        response = TestClient(app).get(TODAY_STATUS)
        assert response.status_code == 401

    def test_clock_in_requires_auth(self) -> None:
        response = TestClient(app).post(CLOCK_IN)
        assert response.status_code == 401

    def test_clock_out_requires_auth(self) -> None:
        response = TestClient(app).patch(CLOCK_OUT, json={"notes": "done"})
        assert response.status_code == 401

    def test_attendance_requires_auth(self) -> None:
        response = TestClient(app).get(ATTENDANCE)
        assert response.status_code == 401

    def test_attendance_summary_requires_auth(self) -> None:
        response = TestClient(app).get(SUMMARY)
        assert response.status_code == 401


class TestTodayStatus:
    def test_no_row_means_can_clock_in(self, api, freeze_manila) -> None:
        freeze_manila(MID_MORNING)

        response = api.get(TODAY_STATUS)

        assert response.status_code == 200
        assert response.json() == {"can_clock_in": True, "can_clock_out": False}

    def test_open_row_means_can_clock_out(self, api, table, freeze_manila) -> None:
        freeze_manila(MID_MORNING)
        table.seed(
            user_id=USER_ID,
            date="2026-09-06",
            time_in="2026-09-06T01:00:00+00:00",
            time_out=None,
        )

        response = api.get(TODAY_STATUS)

        assert response.status_code == 200
        assert response.json() == {"can_clock_in": False, "can_clock_out": True}

    def test_closed_row_means_neither_action(self, api, table, freeze_manila) -> None:
        freeze_manila(MID_MORNING)
        table.seed(
            user_id=USER_ID,
            date="2026-09-06",
            time_in="2026-09-06T01:00:00+00:00",
            time_out="2026-09-06T08:00:00+00:00",
        )

        response = api.get(TODAY_STATUS)

        assert response.status_code == 200
        assert response.json() == {"can_clock_in": False, "can_clock_out": False}

    def test_uses_manila_calendar_day_not_utc(self, api, table, freeze_manila) -> None:
        freeze_manila(AFTER_MIDNIGHT_MANILA)
        table.seed(
            user_id=USER_ID,
            date="2026-09-05",
            time_in="2026-09-05T16:00:00+00:00",
            time_out=None,
        )

        response = api.get(TODAY_STATUS)

        assert response.status_code == 200
        assert response.json() == {"can_clock_in": True, "can_clock_out": False}

    def test_ignores_another_users_row(self, api, table, freeze_manila) -> None:
        freeze_manila(MID_MORNING)
        table.seed(
            user_id=OTHER_USER_ID,
            date="2026-09-06",
            time_in="2026-09-06T01:00:00+00:00",
            time_out=None,
        )

        response = api.get(TODAY_STATUS)

        assert response.status_code == 200
        assert response.json() == {"can_clock_in": True, "can_clock_out": False}


class TestClockIn:
    def test_creates_todays_row(self, api, freeze_manila) -> None:
        freeze_manila(ON_TIME)

        response = api.post(CLOCK_IN)

        assert response.status_code == 200
        body = response.json()
        assert body["user_id"] == USER_ID
        assert body["date"] == "2026-09-06"
        assert _iso(body["time_in"]) == ON_TIME
        assert body["is_late"] is False
        assert body["time_out"] is None
        assert body["id"]

    def test_on_time_at_nine(self, api, freeze_manila) -> None:
        freeze_manila(AT_NINE)

        body = api.post(CLOCK_IN).json()

        assert body["is_late"] is False
        assert body["date"] == "2026-09-06"

    def test_late_one_second_after_nine(self, api, freeze_manila) -> None:
        freeze_manila(JUST_LATE)

        body = api.post(CLOCK_IN).json()

        assert body["is_late"] is True
        assert _iso(body["time_in"]) == JUST_LATE

    def test_date_follows_manila_not_utc(self, api, freeze_manila) -> None:
        freeze_manila(AFTER_MIDNIGHT_MANILA)

        body = api.post(CLOCK_IN).json()

        assert body["date"] == "2026-09-06"
        assert _iso(body["time_in"]) == AFTER_MIDNIGHT_MANILA

    def test_second_clock_in_same_day_is_conflict(
        self, api, table, freeze_manila
    ) -> None:
        freeze_manila(MID_MORNING)
        table.seed(user_id=USER_ID, date="2026-09-06", time_in=MID_MORNING.isoformat())

        response = api.post(CLOCK_IN)

        assert response.status_code == 409
        assert response.json()["detail"] == "User has already clocked in today"

    def test_does_not_write_another_users_id(self, api, table, freeze_manila) -> None:
        freeze_manila(ON_TIME)

        api.post(CLOCK_IN)

        assert [row["user_id"] for row in table.rows] == [USER_ID]


class TestClockOut:
    def test_method_is_patch(self, api, freeze_manila) -> None:
        freeze_manila(MID_MORNING)

        response = api.post(CLOCK_OUT, json={"notes": "done"})

        assert response.status_code == 405

    def test_sets_time_out_and_notes(self, api, table, freeze_manila) -> None:
        clocked_in = datetime(2026, 9, 6, 8, 0, 0, tzinfo=MANILA)
        clocked_out = datetime(2026, 9, 6, 17, 15, 0, tzinfo=MANILA)
        freeze_manila(clocked_out)
        table.seed(
            user_id=USER_ID,
            date="2026-09-06",
            time_in=clocked_in.isoformat(),
            time_out=None,
        )

        response = api.patch(CLOCK_OUT, json={"notes": "shipped the timeout feature"})

        assert response.status_code == 200
        body = response.json()
        assert body["date"] == "2026-09-06"
        assert _iso(body["time_in"]) == clocked_in
        assert _iso(body["time_out"]) == clocked_out
        assert body["notes"] == "shipped the timeout feature"
        assert _iso(body["updated_at"]) != _iso(body["created_at"])

    def test_missing_clock_in_is_not_found(self, api, freeze_manila) -> None:
        freeze_manila(MID_MORNING)

        response = api.patch(CLOCK_OUT, json={"notes": "done"})

        assert response.status_code == 404
        assert response.json()["detail"] == "User has not clocked in today"

    def test_already_clocked_out_is_conflict(self, api, table, freeze_manila) -> None:
        freeze_manila(MID_MORNING)
        table.seed(
            user_id=USER_ID,
            date="2026-09-06",
            time_in="2026-09-06T01:00:00+00:00",
            time_out="2026-09-06T08:00:00+00:00",
        )

        response = api.patch(CLOCK_OUT, json={"notes": "again"})

        assert response.status_code == 409
        assert response.json()["detail"] == "User has already clocked out today"

    def test_conflict_when_row_closes_between_read_and_write(
        self, api, table, freeze_manila
    ) -> None:
        freeze_manila(MID_MORNING)
        seeded = table.seed(
            user_id=USER_ID,
            date="2026-09-06",
            time_in="2026-09-06T01:00:00+00:00",
            time_out=None,
        )

        def close_row() -> None:
            for row in table.rows:
                if row["id"] == seeded["id"]:
                    row["time_out"] = "2026-09-06T08:00:00+00:00"

        table.before_update = close_row

        response = api.patch(CLOCK_OUT, json={"notes": "race"})

        assert response.status_code == 409
        assert response.json()["detail"] == "User has already clocked out today"

    def test_does_not_close_another_users_row(self, api, table, freeze_manila) -> None:
        freeze_manila(MID_MORNING)
        other = table.seed(
            user_id=OTHER_USER_ID,
            date="2026-09-06",
            time_in="2026-09-06T01:00:00+00:00",
            time_out=None,
        )

        response = api.patch(CLOCK_OUT, json={"notes": "mine"})

        assert response.status_code == 404
        assert table.rows[0]["time_out"] is None
        assert table.rows[0]["id"] == other["id"]

    def test_yesterday_open_row_is_not_todays_clock_out(
        self, api, table, freeze_manila
    ) -> None:
        freeze_manila(AFTER_MIDNIGHT_MANILA)
        table.seed(
            user_id=USER_ID,
            date="2026-09-05",
            time_in="2026-09-05T08:00:00+08:00",
            time_out=None,
        )

        response = api.patch(CLOCK_OUT, json={"notes": "overnight"})

        assert response.status_code == 404
        assert table.rows[0]["time_out"] is None


class TestListAttendance:
    def test_empty_list_is_ok(self, api, freeze_manila) -> None:
        freeze_manila(MID_MORNING)

        response = api.get(ATTENDANCE)

        assert response.status_code == 200
        assert response.json() == []

    def test_default_is_this_week_newest_first(self, api, table, freeze_manila) -> None:
        freeze_manila(MID_MORNING)
        _attendance(table, "2026-08-30", time_out="2026-08-30T08:00:00+00:00")
        monday = _attendance(
            table, "2026-08-31", time_out="2026-08-31T08:00:00+00:00"
        )
        today = _attendance(
            table, "2026-09-06", time_out="2026-09-06T08:00:00+00:00"
        )
        _attendance(table, "2026-09-06", user_id=OTHER_USER_ID)

        response = api.get(ATTENDANCE)

        assert response.status_code == 200
        body = response.json()
        assert [row["id"] for row in body] == [today["id"], monday["id"]]

    def test_explicit_range_and_single_bound(self, api, table, freeze_manila) -> None:
        freeze_manila(MID_MORNING)
        _attendance(table, "2026-09-01", time_out="2026-09-01T08:00:00+00:00")
        mid = _attendance(table, "2026-09-03", time_out="2026-09-03T08:00:00+00:00")
        _attendance(table, "2026-09-05", time_out="2026-09-05T08:00:00+00:00")

        ranged = api.get(
            ATTENDANCE, params={"from_date": "2026-09-02", "to_date": "2026-09-04"}
        )
        assert [row["date"] for row in ranged.json()] == ["2026-09-03"]

        one = api.get(ATTENDANCE, params={"from_date": "2026-09-03"})
        assert [row["id"] for row in one.json()] == [mid["id"]]

    def test_inverted_range_is_bad_request(self, api, freeze_manila) -> None:
        freeze_manila(MID_MORNING)

        response = api.get(
            ATTENDANCE, params={"from_date": "2026-09-10", "to_date": "2026-09-01"}
        )

        assert response.status_code == 400
        assert response.json()["detail"] == "Start date must be on or before end date"

    def test_range_over_31_days_is_bad_request(self, api, freeze_manila) -> None:
        freeze_manila(MID_MORNING)

        response = api.get(
            ATTENDANCE, params={"from_date": "2026-09-01", "to_date": "2026-10-02"}
        )

        assert response.status_code == 400
        assert response.json()["detail"] == "Maximum range of days is 31"


class TestListAttendanceSummary:
    def test_empty_list_is_ok(self, api, freeze_manila) -> None:
        freeze_manila(MID_MORNING)

        response = api.get(SUMMARY)

        assert response.status_code == 200
        assert response.json() == []

    def test_this_year_statuses_oldest_first(self, api, table, freeze_manila) -> None:
        freeze_manila(MID_MORNING)
        _attendance(table, "2025-12-31", time_out="2025-12-31T08:00:00+00:00")
        _attendance(table, "2026-01-01", time_out="2026-01-01T08:00:00+00:00")
        _attendance(
            table,
            "2026-09-02",
            is_late=True,
            time_out="2026-09-02T08:00:00+00:00",
        )
        _attendance(table, "2026-09-03")
        _attendance(table, "2026-09-04", is_late=True)
        _attendance(table, "2026-09-06", user_id=OTHER_USER_ID)

        response = api.get(SUMMARY)

        assert response.status_code == 200
        assert response.json() == [
            {"date": "2026-01-01", "status": "on_time"},
            {"date": "2026-09-02", "status": "late"},
            {"date": "2026-09-03", "status": "incomplete"},
            {"date": "2026-09-04", "status": "late"},
        ]
