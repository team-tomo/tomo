import asyncio
from collections.abc import AsyncIterator

from tomo.chat.status import Status


class ChatStream:
    """One chat turn's events: the run fills it, the response drains it.

    A run and its sub-agent runs push from wherever they are; the endpoint
    reads them in order. Repeated status labels and status-then-text are
    settled here, so callers just say what happened.
    """

    def __init__(self) -> None:
        self._events: asyncio.Queue[dict | None] = asyncio.Queue()
        self._status: Status | None = None

    def status(self, status: Status | None) -> None:
        """Show this status, or clear the line when status is None."""

        if status == self._status:
            return
        self._status = status
        self._events.put_nowait(
            {"type": "status", "text": None}
            if status is None
            else {"type": "status", "text": status.text, "kind": status.kind}
        )

    def text(self, delta: str) -> None:
        """Add to the reply, clearing any status first."""

        self.status(None)
        self._events.put_nowait({"type": "text", "delta": delta})

    def close(self) -> None:
        """No more events are coming."""

        self._events.put_nowait(None)

    async def drain(self) -> AsyncIterator[dict]:
        """Events in order, until close()."""

        while (event := await self._events.get()) is not None:
            yield event
