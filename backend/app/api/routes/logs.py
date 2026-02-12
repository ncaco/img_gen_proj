"""
관리자용 로그 조회 API
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.routes.auth import get_current_user_required
from app.database import get_db
from app.database.models import ApiUsageLog, User
from app.schemas.log import ApiUsageLogItemSchema, ApiUsageLogListResponseSchema

router = APIRouter(prefix="/logs", tags=["logs"])


def get_current_admin(user: User = Depends(get_current_user_required)) -> User:
    """관리자만 접근 가능하도록 제한."""
    if getattr(user, "is_admin", 0) != 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="관리자만 접근할 수 있습니다.",
        )
    return user


@router.get("/api-usage", response_model=ApiUsageLogListResponseSchema)
def list_api_usage_logs(
    operation_type: str | None = Query(
        None,
        description="구분: post_creation(글생성), image_generation(이미지생성)",
        alias="operationType",
    ),
    model: str | None = Query(
        None,
        description="모델명 필터 (부분 일치)",
    ),
    limit: int = Query(50, ge=1, le=200, description="페이지 크기"),
    offset: int = Query(0, ge=0, description="오프셋"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """
    API 사용 로그 목록 조회 (관리자 전용).
    - operationType: post_creation | image_generation 필터
    - model: 모델명 부분 일치 필터
    - limit/offset: 페이지네이션
    """
    q = db.query(ApiUsageLog)

    if operation_type:
        q = q.filter(ApiUsageLog.operation_type == operation_type)
    if model:
        like_expr = f"%{model}%"
        q = q.filter(ApiUsageLog.model.ilike(like_expr))

    total = q.count()
    rows = (
        q.order_by(ApiUsageLog.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    items: list[ApiUsageLogItemSchema] = []
    for row in rows:
        items.append(
            ApiUsageLogItemSchema(
                id=row.id,
                operationType=row.operation_type,
                model=row.model,
                inputTokens=row.input_tokens,
                outputTokens=row.output_tokens,
                costUsd=row.cost_usd,
                userId=row.user_id,
                extra=row.extra or None,
                createdAt=row.created_at,
            )
        )

    return ApiUsageLogListResponseSchema(
        success=True,
        total=total,
        items=items,
    )

