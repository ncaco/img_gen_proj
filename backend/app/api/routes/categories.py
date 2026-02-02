"""
카테고리 API: 1뎁스(타입) + 2뎁스(항목). 관리자 전용 CRUD + 플로우용 공개 목록.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query

from sqlalchemy.orm import Session

from app.database.database import get_db
from app.database.models import User
from app.schemas.category import (
    CategoryTypeCreateSchema,
    CategoryTypeUpdateSchema,
    CategoryCreateSchema,
    CategoryUpdateSchema,
)
from app.services.category_type_service import (
    list_category_types,
    get_category_type_by_id,
    create_category_type,
    update_category_type,
    soft_delete_category_type,
    restore_category_type,
)
from app.services.category_service import (
    list_categories,
    list_categories_for_flow,
    get_category_by_id,
    create_category,
    update_category,
    soft_delete_category,
    restore_category,
)
from app.api.routes.auth import get_current_user_required

router = APIRouter(prefix="/categories", tags=["categories"])


def get_current_admin(user: User = Depends(get_current_user_required)) -> User:
    """관리자만 허용."""
    if getattr(user, "is_admin", 0) != 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="관리자만 접근할 수 있습니다.",
        )
    return user


def _type_to_response(t) -> dict:
    """1뎁스 ORM → camelCase dict."""
    return {
        "id": t.id,
        "typeKey": t.type_key,
        "name": t.name,
        "sortOrder": t.sort_order,
        "isUsed": t.is_used,
        "deletedAt": t.deleted_at.isoformat() if t.deleted_at else None,
        "createdAt": t.created_at.isoformat() if t.created_at else None,
        "updatedAt": t.updated_at.isoformat() if t.updated_at else None,
    }


def _category_to_response(c) -> dict:
    """2·3·4뎁스 ORM → camelCase dict."""
    type_key = c.category_type.type_key if c.category_type else (getattr(c, "type", None) or "")
    return {
        "id": c.id,
        "typeId": c.type_id,
        "parentId": c.parent_id,
        "typeKey": type_key,
        "name": c.name,
        "sortOrder": c.sort_order,
        "isUsed": c.is_used,
        "deletedAt": c.deleted_at.isoformat() if c.deleted_at else None,
        "createdAt": c.created_at.isoformat() if c.created_at else None,
        "updatedAt": c.updated_at.isoformat() if c.updated_at else None,
    }


# ---- 공개: 플로우/입력 파라미터용 (사용중·미삭제만, type_key별 name 리스트) ----
@router.get("/list/public")
async def list_categories_public(db: Session = Depends(get_db)):
    """
    플로우 입력 파라미터 등에서 사용할 카테고리 목록.
    사용중·미삭제 1뎁스별 2뎁스 name 리스트. { type_key: [name,...], ... }
    """
    data = list_categories_for_flow(db)
    return {"success": True, **data}


# ---- 관리자: 1뎁스(카테고리 타입) CRUD ----
@router.get("/types/list")
async def list_types_admin(
    include_deleted: bool = Query(False, description="소프트 삭제된 항목 포함"),
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """관리자: 1뎁스(카테고리 타입) 목록."""
    items = list_category_types(db, include_deleted=include_deleted, include_unused=True)
    return {"success": True, "total": len(items), "types": [_type_to_response(t) for t in items]}


@router.post("/types")
async def create_type_route(
    body: CategoryTypeCreateSchema,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """관리자: 1뎁스(카테고리 타입) 생성."""
    try:
        t = create_category_type(
            db,
            type_key=body.type_key,
            name=body.name,
            sort_order=body.sort_order,
            is_used=body.is_used,
        )
        return _type_to_response(t)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/types/{type_id}")
async def update_type_route(
    type_id: int,
    body: CategoryTypeUpdateSchema,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """관리자: 1뎁스(카테고리 타입) 수정."""
    try:
        t = update_category_type(
            db,
            type_id,
            type_key=body.type_key,
            name=body.name,
            sort_order=body.sort_order,
            is_used=body.is_used,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not t:
        raise HTTPException(status_code=404, detail="카테고리 타입을 찾을 수 없습니다.")
    return _type_to_response(t)


@router.post("/types/{type_id}/soft-delete")
async def soft_delete_type_route(
    type_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """관리자: 1뎁스 소프트 삭제."""
    t = soft_delete_category_type(db, type_id)
    if not t:
        raise HTTPException(status_code=404, detail="카테고리 타입을 찾을 수 없습니다.")
    return _type_to_response(t)


@router.post("/types/{type_id}/restore")
async def restore_type_route(
    type_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """관리자: 1뎁스 복원."""
    t = restore_category_type(db, type_id)
    if not t:
        raise HTTPException(status_code=404, detail="카테고리 타입을 찾을 수 없거나 이미 복원된 상태입니다.")
    return _type_to_response(t)


# ---- 관리자: 2·3·4뎁스(카테고리 항목) CRUD ----
@router.get("/list")
async def list_categories_admin(
    type_id: int | None = Query(None, description="1뎁스 타입 ID (2뎁스 목록 시)"),
    parent_id: int | None = Query(None, description="상위 카테고리 ID (3·4뎁스 목록 시)"),
    include_deleted: bool = Query(False, description="소프트 삭제된 항목 포함"),
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """관리자: 카테고리 목록. parent_id 없으면 2뎁스(type_id 필터), 있으면 해당 하위(3·4뎁스)."""
    items = list_categories(db, type_id=type_id, parent_id=parent_id, include_deleted=include_deleted, include_unused=True)
    return {"success": True, "total": len(items), "categories": [_category_to_response(c) for c in items]}


@router.post("")
async def create_category_route(
    body: CategoryCreateSchema,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """관리자: 카테고리 생성. type_id=2뎁스, parent_id=3·4뎁스."""
    try:
        c = create_category(
            db,
            type_id=body.type_id,
            parent_id=body.parent_id,
            name=body.name,
            sort_order=body.sort_order,
            is_used=body.is_used,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return _category_to_response(c)


@router.patch("/{category_id}")
async def update_category_route(
    category_id: int,
    body: CategoryUpdateSchema,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """관리자: 카테고리 수정 (이름, 정렬, 사용여부)."""
    c = update_category(
        db,
        category_id,
        name=body.name,
        sort_order=body.sort_order,
        is_used=body.is_used,
    )
    if not c:
        raise HTTPException(status_code=404, detail="카테고리를 찾을 수 없습니다.")
    return _category_to_response(c)


@router.post("/{category_id}/soft-delete")
async def soft_delete_category_route(
    category_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """관리자: 카테고리 소프트 삭제."""
    c = soft_delete_category(db, category_id)
    if not c:
        raise HTTPException(status_code=404, detail="카테고리를 찾을 수 없습니다.")
    return _category_to_response(c)


@router.post("/{category_id}/restore")
async def restore_category_route(
    category_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """관리자: 카테고리 복원 (소프트 삭제 해제)."""
    c = restore_category(db, category_id)
    if not c:
        raise HTTPException(status_code=404, detail="카테고리를 찾을 수 없거나 이미 복원된 상태입니다.")
    return _category_to_response(c)
