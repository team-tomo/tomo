from dataclasses import dataclass, field

from tomo.account.service import AccountService
from tomo.chat.stream import ChatStream
from tomo.context import AuthContext
from tomo.leave.service import LeaveService
from tomo.timesheet.service import TimesheetService


@dataclass(frozen=True, slots=True)
class LeaveDrafts:
    items: list[dict] = field(default_factory=list)


@dataclass(frozen=True, slots=True)
class ChatDeps:
    auth_context: AuthContext
    timesheet_service: TimesheetService
    account_service: AccountService
    leave_service: LeaveService
    leave_drafts: LeaveDrafts
    stream: ChatStream
