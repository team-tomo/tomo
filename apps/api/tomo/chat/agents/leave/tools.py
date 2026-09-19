from datetime import date, datetime, timedelta

from pydantic import ValidationError
from pydantic_ai import RunContext
from tomo.chat.deps import ChatDeps
from tomo.core.config import APP_TIME_ZONE
from tomo.core.dates import app_dates
from tomo.leave.schemas import FileLeaveRequestSchema, LeaveRequestSchema

_LEAVE_TYPE_ALIASES = {
    "vl": "vl",
    "vacation": "vl",
    "vacation leave": "vl",
    "sl": "sl",
    "sick": "sl",
    "sick leave": "sl",
    "el": "el",
    "emergency": "el",
    "emergency leave": "el",
    "ml": "ml",
    "maternity": "ml",
    "maternity leave": "ml",
    "pl": "pl",
    "paternity": "pl",
    "paternity leave": "pl",
}

_COVERAGE_ALIASES = {
    "whole": "whole",
    "whole day": "whole",
    "full": "whole",
    "full day": "whole",
    "half": "half",
    "half day": "half",
}


def _normalize_leave_type(value: str) -> str:
    key = " ".join(value.strip().lower().replace("_", " ").split())
    return _LEAVE_TYPE_ALIASES.get(key, key)


def _normalize_coverage(value: str) -> str:
    key = " ".join(value.strip().lower().replace("_", " ").replace("-", " ").split())
    return _COVERAGE_ALIASES.get(key, key)


async def get_leave_requests(
    ctx: RunContext[ChatDeps],
    from_date: date | None = None,
    to_date: date | None = None,
) -> list[LeaveRequestSchema]:
    """This user's Leave Requests in a date range.

    Omit both dates for this week (Monday through today, Asia/Manila).
    One day = the same date on both ends.
    """
    rows = await ctx.deps.leave_service.list_leave_requests(ctx.deps.auth_context)
    start, end = _range(from_date, to_date)
    return [row for row in rows if start <= row.date <= end]


async def propose_leave(
    ctx: RunContext[ChatDeps],
    date: date,
    leave_type: str,
    coverage: str,
    reason: str,
) -> dict:
    """Prepare one Leave Request draft. Does not file it.

    leave_type: VL, SL, EL, ML, or PL (any casing). coverage: whole or half.
    """

    try:
        payload = FileLeaveRequestSchema(
            date=date,
            leave_type=_normalize_leave_type(leave_type),
            coverage=_normalize_coverage(coverage),
            reason=reason,
        )
    except ValidationError:
        return {
            "ok": False,
            "error": "Need a valid leave type (VL, SL, EL, ML, PL) and coverage (whole or half).",
        }
    today = datetime.now(APP_TIME_ZONE).date()
    if payload.date < today - timedelta(days=1):
        return {
            "ok": False,
            "error": "Date cannot be earlier than yesterday",
        }
    existing = await get_leave_requests(
        ctx, from_date=payload.date, to_date=payload.date
    )
    if any(row.status in ("pending", "approved") for row in existing):
        return {
            "ok": False,
            "error": "A pending or approved leave request already exists for this date",
        }
    draft = {
        "date": payload.date.isoformat(),
        "leave_type": payload.leave_type,
        "coverage": payload.coverage,
        "reason": payload.reason,
    }
    ctx.deps.leave_drafts.items.append(draft)
    return {"ok": True, **draft}


def _range(from_date: date | None, to_date: date | None) -> tuple[date, date]:
    if from_date is None and to_date is None:
        bounds = app_dates()
        return bounds.this_week_start, bounds.today
    if from_date is None:
        return to_date, to_date
    if to_date is None:
        return from_date, from_date
    return from_date, to_date
