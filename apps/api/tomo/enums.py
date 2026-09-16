from enum import StrEnum


class UserRole(StrEnum):
    DEV = "dev"
    EXECUTIVE = "executive"
    SUPPORT = "support"
    LEAD = "lead"
    IC = "ic"


ADMIN_ROLES = frozenset[UserRole]({UserRole.DEV, UserRole.EXECUTIVE, UserRole.SUPPORT})
MANAGER_ROLES = frozenset[UserRole]({UserRole.LEAD, UserRole.EXECUTIVE})
