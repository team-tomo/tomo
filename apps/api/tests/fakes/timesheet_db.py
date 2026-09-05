from copy import deepcopy
from datetime import UTC, datetime
from uuid import uuid4

from postgrest.exceptions import APIError


class FakeResponse:
    def __init__(self, data: list[dict]):
        self.data = data


class TimesheetTable:
    """In-memory timesheet table with the real unique (user_id, date) rule."""

    def __init__(self) -> None:
        self.rows: list[dict] = []
        self.before_update = None

    def seed(self, **row) -> dict:
        stored = {
            "id": str(row.get("id") or uuid4()),
            "user_id": row["user_id"],
            "date": _as_date(row["date"]),
            "time_in": row.get("time_in"),
            "time_out": row.get("time_out"),
            "is_late": row.get("is_late", False),
            "notes": row.get("notes"),
            "created_at": row.get("created_at") or _utc_now_iso(),
            "updated_at": row.get("updated_at") or _utc_now_iso(),
        }
        self._reject_duplicate(stored)
        self.rows.append(stored)
        return deepcopy(stored)

    def insert(self, data: dict) -> list[dict]:
        stored = self.seed(**data)
        return [deepcopy(stored)]

    def select(self, filters: list[tuple], limit: int | None) -> list[dict]:
        matched = [deepcopy(row) for row in self.rows if _matches(row, filters)]
        if limit is not None:
            return matched[:limit]
        return matched

    def update(self, data: dict, filters: list[tuple]) -> list[dict]:
        if self.before_update is not None:
            self.before_update()
        updated: list[dict] = []
        for row in self.rows:
            if not _matches(row, filters):
                continue
            row.update(data)
            row["updated_at"] = _utc_now_iso()
            updated.append(deepcopy(row))
        return updated

    def _reject_duplicate(self, incoming: dict) -> None:
        for row in self.rows:
            if (
                row["user_id"] == incoming["user_id"]
                and row["date"] == incoming["date"]
            ):
                raise APIError(
                    {
                        "code": "23505",
                        "message": "duplicate key value violates unique constraint",
                        "details": "Key (user_id, date) already exists.",
                        "hint": None,
                    }
                )


class FakeTimesheetClient:
    def __init__(self, table: TimesheetTable) -> None:
        self._table = table

    def from_(self, name: str) -> "FakeQuery":
        if name != "timesheet":
            raise AssertionError(f"unexpected table {name}")
        return FakeQuery(self._table)


class FakeQuery:
    def __init__(self, table: TimesheetTable) -> None:
        self._table = table
        self._action = "select"
        self._payload: dict | None = None
        self._filters: list[tuple] = []
        self._limit: int | None = None

    def select(self, *_args) -> "FakeQuery":
        return self

    def insert(self, data: dict) -> "FakeQuery":
        self._action = "insert"
        self._payload = data
        return self

    def update(self, data: dict) -> "FakeQuery":
        self._action = "update"
        self._payload = data
        return self

    def eq(self, column: str, value) -> "FakeQuery":
        self._filters.append(("eq", column, value))
        return self

    def is_(self, column: str, value) -> "FakeQuery":
        self._filters.append(("is", column, value))
        return self

    def limit(self, count: int) -> "FakeQuery":
        self._limit = count
        return self

    async def execute(self) -> FakeResponse:
        if self._action == "insert":
            assert self._payload is not None
            return FakeResponse(self._table.insert(self._payload))
        if self._action == "update":
            assert self._payload is not None
            return FakeResponse(self._table.update(self._payload, self._filters))
        return FakeResponse(self._table.select(self._filters, self._limit))


def _as_date(value) -> str:
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)[:10]


def _utc_now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _matches(row: dict, filters: list[tuple]) -> bool:
    for op, column, value in filters:
        current = row.get(column)
        if op == "eq":
            if column == "date" and _as_date(current) != _as_date(value):
                return False
            if column != "date" and str(current) != str(value):
                return False
        elif op == "is":
            if value in (None, "null") and current is not None:
                return False
        else:
            raise AssertionError(f"unsupported filter {op}")
    return True
