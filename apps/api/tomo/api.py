from fastapi import APIRouter

from tomo.auth.endpoints import router as auth_router
from tomo.healthz.endpoints import router as healthz_router
from tomo.timesheet.endpoints import router as timesheet_router

router = APIRouter(prefix="/api/v1")

# /api/v1/healthz - health check endpoints
router.include_router(healthz_router)
# /api/v1/auth - auth endpoints
router.include_router(auth_router)
# /api/v1/timesheet - timesheet endpoints
router.include_router(timesheet_router)
