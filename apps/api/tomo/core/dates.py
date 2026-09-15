from dataclasses import dataclass
from datetime import date, datetime, timedelta

from tomo.core.config import APP_TIME_ZONE

_WEEKDAYS = (
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
)


@dataclass(frozen=True, slots=True)
class AppDates:
    today: date
    weekday: str
    today_year: int
    this_week_start: date
    last_week_start: date
    last_week_end: date

    def format(self, template: str) -> str:
        return template.format(
            today=self.today.isoformat(),
            weekday=self.weekday,
            today_year=self.today_year,
            this_week_start=self.this_week_start.isoformat(),
            last_week_start=self.last_week_start.isoformat(),
            last_week_end=self.last_week_end.isoformat(),
        )


def app_dates(today: date | None = None) -> AppDates:
    today = today or datetime.now(APP_TIME_ZONE).date()
    this_week_start = today - timedelta(days=today.weekday())
    last_week_start = this_week_start - timedelta(days=7)
    last_week_end = this_week_start - timedelta(days=1)
    return AppDates(
        today=today,
        weekday=_WEEKDAYS[today.weekday()],
        today_year=today.year,
        this_week_start=this_week_start,
        last_week_start=last_week_start,
        last_week_end=last_week_end,
    )
