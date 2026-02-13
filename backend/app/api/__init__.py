"""
API 모듈
"""
from fastapi import APIRouter
from app.api.routes import (
    cards,
    upload,
    auth,
    workspaces,
    categories,
    flow,
    card_sns_posts,
    logs,
    hero_auto,
)

# API 라우터 통합
api_router = APIRouter()

# 각 라우터 등록
api_router.include_router(cards.router)
api_router.include_router(upload.router)
api_router.include_router(auth.router)
api_router.include_router(workspaces.router)
api_router.include_router(categories.router)
api_router.include_router(flow.router)
api_router.include_router(card_sns_posts.router)
api_router.include_router(logs.router)
api_router.include_router(hero_auto.router)

__all__ = ["api_router"]
