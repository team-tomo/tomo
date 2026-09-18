from uuid import UUID

from fastapi import APIRouter, Request

from tomo.core.rate_limiter import limiter
from tomo.dependencies import AuthContextDependency, LeaveServiceDependency
from tomo.leave.schemas import FileLeaveRequestSchema, LeaveRequestSchema

router = APIRouter(prefix="/leave", tags=["leave"])


@router.post("")
@limiter.limit("20/minute")
async def file_leave_request(
    request: Request,
    payload: FileLeaveRequestSchema,
    auth_context: AuthContextDependency,
    service: LeaveServiceDependency,
) -> LeaveRequestSchema:
    """File a leave request."""
    return await service.file_leave_request(payload, auth_context)


@router.get("")
@limiter.limit("20/minute")
async def list_leave_requests(
    request: Request,
    auth_context: AuthContextDependency,
    service: LeaveServiceDependency,
) -> list[LeaveRequestSchema]:
    """List all leave requests of the current user."""
    return await service.list_leave_requests(auth_context)


@router.get("/{leave_id}")
@limiter.limit("20/minute")
async def get_leave_request(
    request: Request,
    leave_id: UUID,
    auth_context: AuthContextDependency,
    service: LeaveServiceDependency,
) -> LeaveRequestSchema:
    """Get a leave request by id."""
    return await service.get_leave_request(str(leave_id), auth_context)


@router.post("/{leave_id}/cancel")
@limiter.limit("20/minute")
async def cancel_leave_request(
    request: Request,
    leave_id: UUID,
    auth_context: AuthContextDependency,
    service: LeaveServiceDependency,
) -> LeaveRequestSchema:
    """Cancel a pending leave request. Filer only."""
    return await service.cancel_leave_request(str(leave_id), auth_context)
