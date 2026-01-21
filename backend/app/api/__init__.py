"""
API 모듈
"""
from fastapi import APIRouter
from app.api.routes import cards, upload

# API 라우터 통합
api_router = APIRouter()

# 각 라우터 등록
api_router.include_router(cards.router)
api_router.include_router(upload.router)

__all__ = ["api_router"]
