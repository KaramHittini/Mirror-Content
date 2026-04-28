from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, analysis, reports

router = APIRouter(prefix="/api/v1")
router.include_router(auth.router)
router.include_router(users.router)
router.include_router(analysis.router)
router.include_router(reports.router)
