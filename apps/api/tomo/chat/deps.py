from dataclasses import dataclass

from tomo.account.service import AccountService
from tomo.context import AuthContext
from tomo.timesheet.service import TimesheetService


@dataclass(frozen=True, slots=True)
class ChatDeps:
    auth_context: AuthContext
    timesheet_service: TimesheetService
    account_service: AccountService
