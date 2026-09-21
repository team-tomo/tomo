from calendar import monthrange
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


def _named_week(monday: date) -> str:
    return ", ".join(
        f"{_WEEKDAYS[i]} {(monday + timedelta(days=i)).isoformat()}"
        for i in range(7)
    )


@dataclass(frozen=True, slots=True)
class AppDates:
    today: date
    weekday: str
    today_year: int
    yesterday: date
    tomorrow: date
    this_week_start: date
    this_week_end: date
    last_week_start: date
    last_week_end: date
    next_week_start: date
    next_week_end: date
    month_start: date
    month_end: date
    last_month_start: date
    last_month_end: date

    @property
    def calendar(self) -> str:
        return (
            f"Yesterday {self.yesterday.isoformat()}. "
            f"Tomorrow {self.tomorrow.isoformat()}. "
            f"This week Monday–Sunday: {_named_week(self.this_week_start)}. "
            f"Next week Monday–Sunday: {_named_week(self.next_week_start)}."
        )

    def format(self, template: str) -> str:
        return template.format(
            today=self.today.isoformat(),
            weekday=self.weekday,
            today_year=self.today_year,
            yesterday=self.yesterday.isoformat(),
            tomorrow=self.tomorrow.isoformat(),
            this_week_start=self.this_week_start.isoformat(),
            this_week_end=self.this_week_end.isoformat(),
            last_week_start=self.last_week_start.isoformat(),
            last_week_end=self.last_week_end.isoformat(),
            next_week_start=self.next_week_start.isoformat(),
            next_week_end=self.next_week_end.isoformat(),
            month_start=self.month_start.isoformat(),
            month_end=self.month_end.isoformat(),
            last_month_start=self.last_month_start.isoformat(),
            last_month_end=self.last_month_end.isoformat(),
            calendar=self.calendar,
        )


def app_dates(today: date | None = None) -> AppDates:
    today = today or datetime.now(APP_TIME_ZONE).date()
    this_week_start = today - timedelta(days=today.weekday())
    this_week_end = this_week_start + timedelta(days=6)
    last_week_start = this_week_start - timedelta(days=7)
    last_week_end = this_week_start - timedelta(days=1)
    next_week_start = this_week_start + timedelta(days=7)
    next_week_end = this_week_end + timedelta(days=7)
    month_start = today.replace(day=1)
    month_end = today.replace(day=monthrange(today.year, today.month)[1])
    last_month_end = month_start - timedelta(days=1)
    return AppDates(
        today=today,
        weekday=_WEEKDAYS[today.weekday()],
        today_year=today.year,
        yesterday=today - timedelta(days=1),
        tomorrow=today + timedelta(days=1),
        this_week_start=this_week_start,
        this_week_end=this_week_end,
        last_week_start=last_week_start,
        last_week_end=last_week_end,
        next_week_start=next_week_start,
        next_week_end=next_week_end,
        month_start=month_start,
        month_end=month_end,
        last_month_start=last_month_end.replace(day=1),
        last_month_end=last_month_end,
    )
