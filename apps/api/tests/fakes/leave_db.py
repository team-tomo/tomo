from copy import deepcopy
from datetime import UTC, datetime
from uuid import uuid4

from postgrest.exceptions import APIError

from tests.fakes.timesheet_db import FakeResponse


class ProfilesTable:
    """In-memory profiles table for leave tests."""

    def __init__(self) -> None:
        self.rows: list[dict] = []

    def seed(self, **row) -> dict:
        stored = {
            "id": row["id"],
            "manager_id": row.get("manager_id"),
            "role": row.get("role", "ic"),
            "is_active": row.get("is_active", True),
        }
        self.rows.append(stored)
        return deepcopy(stored)

    def insert(self, data: dict) -> list[dict]:
        stored = self.seed(**data)
        return [deepcopy(stored)]

    def select(
        self,
        filters: list[tuple],
        order: tuple[str, bool] | None,
        limit: int | None,
    ) -> list[dict]:
        matched = [deepcopy(row) for row in self.rows if _matches(row, filters)]
        if order is not None:
            column, descending = order
            matched.sort(key=lambda row: row[column], reverse=descending)
        if limit is not None:
            return matched[:limit]
        return matched

    def update(self, data: dict, filters: list[tuple]) -> list[dict]:
        updated: list[dict] = []
        for row in self.rows:
            if not _matches(row, filters):
                continue
            row.update(data)
            updated.append(deepcopy(row))
        return updated


class LeaveRequestsTable:
    """In-memory leave_requests with the partial unique (profile_id, date) rule."""

    def __init__(self) -> None:
        self.rows: list[dict] = []

    def seed(self, **row) -> dict:
        stored = {
            "id": str(row.get("id") or uuid4()),
            "profile_id": row["profile_id"],
            "date": _as_date(row["date"]),
            "leave_type": row["leave_type"],
            "coverage": row["coverage"],
            "reason": row["reason"],
            "status": row.get("status", "pending"),
            "manager_id": row["manager_id"],
            "decided_by": row.get("decided_by"),
            "decided_at": row.get("decided_at"),
            "created_at": row.get("created_at") or _utc_now_iso(),
            "updated_at": row.get("updated_at") or _utc_now_iso(),
        }
        self._reject_duplicate(stored)
        self.rows.append(stored)
        return deepcopy(stored)

    def insert(self, data: dict) -> list[dict]:
        stored = self.seed(**data)
        return [deepcopy(stored)]

    def select(
        self,
        filters: list[tuple],
        order: tuple[str, bool] | None,
        limit: int | None,
    ) -> list[dict]:
        matched = [deepcopy(row) for row in self.rows if _matches(row, filters)]
        if order is not None:
            column, descending = order
            matched.sort(key=lambda row: row[column], reverse=descending)
        if limit is not None:
            return matched[:limit]
        return matched

    def update(self, data: dict, filters: list[tuple]) -> list[dict]:
        updated: list[dict] = []
        for row in self.rows:
            if not _matches(row, filters):
                continue
            row.update(data)
            row["updated_at"] = _utc_now_iso()
            updated.append(deepcopy(row))
        return updated

    def _reject_duplicate(self, incoming: dict) -> None:
        if incoming["status"] not in ("pending", "approved"):
            return
        for row in self.rows:
            if (
                row["profile_id"] == incoming["profile_id"]
                and row["date"] == incoming["date"]
                and row["status"] in ("pending", "approved")
            ):
                raise APIError(
                    {
                        "code": "23505",
                        "message": "duplicate key value violates unique constraint",
                        "details": "Key (profile_id, date) already exists.",
                        "hint": None,
                    }
                )


class FakeLeaveClient:
    def __init__(
        self, profiles: ProfilesTable, leaves: LeaveRequestsTable
    ) -> None:
        self._profiles = profiles
        self._leaves = leaves

    def from_(self, name: str) -> "FakeLeaveQuery":
        if name == "profiles":
            return FakeLeaveQuery(self._profiles)
        if name == "leave_requests":
            return FakeLeaveQuery(self._leaves)
        raise AssertionError(f"unexpected table {name}")


class FakeLeaveQuery:
    def __init__(self, table: ProfilesTable | LeaveRequestsTable) -> None:
        self._table = table
        self._action = "select"
        self._payload: dict | None = None
        self._filters: list[tuple] = []
        self._order: tuple[str, bool] | None = None
        self._limit: int | None = None

    def select(self, *_args) -> "FakeLeaveQuery":
        return self

    def insert(self, data: dict) -> "FakeLeaveQuery":
        self._action = "insert"
        self._payload = data
        return self

    def update(self, data: dict) -> "FakeLeaveQuery":
        self._action = "update"
        self._payload = data
        return self

    def eq(self, column: str, value) -> "FakeLeaveQuery":
        self._filters.append(("eq", column, value))
        return self

    def in_(self, column: str, values) -> "FakeLeaveQuery":
        self._filters.append(("in", column, values))
        return self

    def order(self, column: str, *, desc: bool = False) -> "FakeLeaveQuery":
        self._order = (column, desc)
        return self

    def limit(self, count: int) -> "FakeLeaveQuery":
        self._limit = count
        return self

    async def execute(self) -> FakeResponse:
        if self._action == "insert":
            assert self._payload is not None
            return FakeResponse(self._table.insert(self._payload))
        if self._action == "update":
            assert self._payload is not None
            return FakeResponse(self._table.update(self._payload, self._filters))
        return FakeResponse(self._table.select(self._filters, self._order, self._limit))


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
        elif op == "in":
            allowed = {str(item) for item in value}
            if str(current) not in allowed:
                return False
        else:
            raise AssertionError(f"unsupported filter {op}")
    return True
