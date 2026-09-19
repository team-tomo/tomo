from datetime import date

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
        "{today} {weekday} {today_year} {this_week_start} {last_week_start} {last_week_end}"
    )

    assert filled == "2026-09-15 Tuesday 2026 2026-09-14 2026-09-07 2026-09-13"


def test_agent_prompts_accept_app_dates() -> None:
    dates = app_dates(date(2026, 9, 15))

    assert "2026-09-07" in dates.format(MOMO_INSTRUCTIONS)
    assert "2026-09-13" in dates.format(TOKI_INSTRUCTIONS)
