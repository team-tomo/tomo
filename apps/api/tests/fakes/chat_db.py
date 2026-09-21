from copy import deepcopy
from datetime import UTC, datetime
from uuid import uuid4

from tests.fakes.timesheet_db import FakeResponse


class ChatTable:
    """In-memory chat_conversations table."""

    def __init__(self) -> None:
        self.rows: list[dict] = []

    def seed(self, **row) -> dict:
        stored = {
            "id": str(row.get("id") or uuid4()),
            "user_id": row["user_id"],
            "messages": deepcopy(row.get("messages") or []),
            "created_at": row.get("created_at") or _utc_now_iso(),
            "updated_at": row.get("updated_at") or _utc_now_iso(),
        }
        self.rows.append(stored)
        return deepcopy(stored)

    def upsert(self, row: dict) -> dict:
        stored = {
            "id": str(row["id"]),
            "user_id": row["user_id"],
            "messages": deepcopy(row["messages"]),
            "created_at": _utc_now_iso(),
            "updated_at": _utc_now_iso(),
        }
        for index, existing in enumerate(self.rows):
            if existing["id"] == stored["id"]:
                stored["created_at"] = existing["created_at"]
                self.rows[index] = stored
                return deepcopy(stored)
        self.rows.append(stored)
        return deepcopy(stored)

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


class FakeChatClient:
    def __init__(self, table: ChatTable) -> None:
        self._table = table

    def from_(self, name: str) -> "FakeChatQuery":
        if name != "chat_conversations":
            raise AssertionError(f"unexpected table {name}")
        return FakeChatQuery(self._table)


class FakeChatQuery:
    def __init__(self, table: ChatTable) -> None:
        self._table = table
        self._filters: list[tuple] = []
        self._order: tuple[str, bool] | None = None
        self._limit: int | None = None
        self._upsert: dict | None = None

    def select(self, *_args) -> "FakeChatQuery":
        return self

    def upsert(self, row: dict) -> "FakeChatQuery":
        self._upsert = row
        return self

    def eq(self, column: str, value) -> "FakeChatQuery":
        self._filters.append(("eq", column, value))
        return self

    def gte(self, column: str, value) -> "FakeChatQuery":
        self._filters.append(("gte", column, value))
        return self

    def order(self, column: str, *, desc: bool = False) -> "FakeChatQuery":
        self._order = (column, desc)
        return self

    def limit(self, count: int) -> "FakeChatQuery":
        self._limit = count
        return self

    async def execute(self) -> FakeResponse:
        if self._upsert is not None:
            return FakeResponse([self._table.upsert(self._upsert)])
        return FakeResponse(self._table.select(self._filters, self._order, self._limit))


def _utc_now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _as_datetime(value) -> datetime:
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))


def _matches(row: dict, filters: list[tuple]) -> bool:
    for op, column, value in filters:
        current = row.get(column)
        if op == "eq":
            if str(current) != str(value):
                return False
        elif op == "gte":
            if _as_datetime(current) < _as_datetime(value):
                return False
        else:
            raise AssertionError(f"unsupported filter {op}")
    return True
