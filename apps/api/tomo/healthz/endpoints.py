from fastapi import APIRouter

router = APIRouter(prefix="/healthz")


@router.get("/")
def healthz() -> dict[str, str]:
    return {"status": "ok"}
