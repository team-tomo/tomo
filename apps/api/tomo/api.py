from fastapi import APIRouter

from tomo.healthz.endpoints import router as healthz_router

router = APIRouter(prefix="/api/v1")

# /api/v1/healthz - health check endpoints
router.include_router(healthz_router)
