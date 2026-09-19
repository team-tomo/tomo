from datetime import date

from tomo.chat.agents.leave.prompts import INSTRUCTIONS as KYU_INSTRUCTIONS
from tomo.chat.agents.timesheet.prompts import INSTRUCTIONS as TOKI_INSTRUCTIONS
from tomo.chat.prompts import INSTRUCTIONS as MOMO_INSTRUCTIONS
from tomo.core.dates import app_dates


def test_midweek_this_and_last_week() -> None:
    dates = app_dates(date(2026, 9, 15))

    assert dates.today == date(2026, 9, 15)
    assert dates.weekday == "Tuesday"
    assert dates.today_year == 2026
    assert dates.this_week_start == date(2026, 9, 14)
    assert dates.last_week_start == date(2026, 9, 7)
    assert dates.last_week_end == date(2026, 9, 13)


def test_monday_is_this_week_start() -> None:
    dates = app_dates(date(2026, 9, 14))

    assert dates.this_week_start == date(2026, 9, 14)
    assert dates.last_week_start == date(2026, 9, 7)
    assert dates.last_week_end == date(2026, 9, 13)


def test_last_week_can_span_years() -> None:
    dates = app_dates(date(2026, 1, 1))

    assert dates.weekday == "Thursday"
    assert dates.this_week_start == date(2025, 12, 29)
    assert dates.last_week_start == date(2025, 12, 22)
    assert dates.last_week_end == date(2025, 12, 28)


def test_format_fills_iso_placeholders() -> None:
    filled = app_dates(date(2026, 9, 15)).format(
        "{today} {weekday} {today_year} {this_week_start} {last_week_start} {last_week_end} {next_week_start} {next_week_end}"
    )

    assert (
        filled
        == "2026-09-15 Tuesday 2026 2026-09-14 2026-09-07 2026-09-13 2026-09-21 2026-09-27"
    )


def test_sunday_next_week_wednesday_is_in_calendar() -> None:
    dates = app_dates(date(2026, 9, 20))

    assert dates.weekday == "Sunday"
    assert dates.yesterday == date(2026, 9, 19)
    assert dates.tomorrow == date(2026, 9, 21)
    assert dates.this_week_start == date(2026, 9, 14)
    assert dates.this_week_end == date(2026, 9, 20)
    assert dates.next_week_start == date(2026, 9, 21)
    assert dates.next_week_end == date(2026, 9, 27)
    assert "Wednesday 2026-09-23" in dates.calendar
    assert "Sunday 2026-09-27" in dates.calendar


def test_agent_prompts_accept_app_dates() -> None:
    dates = app_dates(date(2026, 9, 20))
    momo = dates.format(MOMO_INSTRUCTIONS)
    toki = dates.format(TOKI_INSTRUCTIONS)
    kyu = dates.format(KYU_INSTRUCTIONS)

    assert "2026-09-21" in momo
    assert "Wednesday 2026-09-23" in momo
    assert "2026-09-21" in toki
    assert "2026-09-21" in kyu
    assert "Wednesday 2026-09-23" in kyu
