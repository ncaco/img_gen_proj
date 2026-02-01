"""
2뎁스: 카테고리 항목 비즈니스 로직. category_types(1뎁스)에 소속. 소프트 삭제 및 사용여부 지원.
"""
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.database.models import Category
from app.services.category_type_service import list_category_types


def list_categories(
    db: Session,
    type_id: int | None = None,
    include_deleted: bool = False,
    include_unused: bool = True,
) -> list[Category]:
    """
    카테고리 목록 조회.
    - type_id: 1뎁스 타입 ID (None이면 전체)
    - include_deleted: True면 소프트 삭제된 것도 포함
    - include_unused: True면 사용여부 0인 것도 포함
    """
    q = db.query(Category).filter(Category.type_id.isnot(None))
    if type_id is not None:
        q = q.filter(Category.type_id == type_id)
    if not include_deleted:
        q = q.filter(Category.deleted_at.is_(None))
    if not include_unused:
        q = q.filter(Category.is_used == 1)
    q = q.order_by(Category.sort_order.asc(), Category.id.asc())
    return q.all()


def list_categories_for_flow(db: Session) -> dict:
    """
    플로우/입력 파라미터용: 사용중·미삭제인 1뎁스별 2뎁스 name 리스트.
    반환: { type_key: [name, ...], ... } (예: {"gender": ["남","여"], "class": ["전사",...], ...})
    """
    types = list_category_types(db, include_deleted=False, include_unused=False)
    result = {}
    for t in types:
        items = list_categories(db, type_id=t.id, include_deleted=False, include_unused=False)
        result[t.type_key] = [c.name for c in items]
    return result


def get_category_by_id(db: Session, category_id: int, include_deleted: bool = False) -> Category | None:
    """ID로 카테고리 조회."""
    q = db.query(Category).filter(Category.id == category_id)
    if not include_deleted:
        q = q.filter(Category.deleted_at.is_(None))
    return q.first()


def create_category(
    db: Session,
    type_id: int,
    name: str,
    sort_order: int = 0,
    is_used: int = 1,
) -> Category:
    """카테고리 생성 (2뎁스). type_id는 1뎁스 타입 ID."""
    c = Category(type_id=type_id, name=name.strip(), sort_order=sort_order, is_used=is_used)
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


def update_category(
    db: Session,
    category_id: int,
    name: str | None = None,
    sort_order: int | None = None,
    is_used: int | None = None,
) -> Category | None:
    """카테고리 수정 (관리자용)."""
    c = get_category_by_id(db, category_id, include_deleted=True)
    if not c:
        return None
    if name is not None:
        c.name = name.strip()
    if sort_order is not None:
        c.sort_order = sort_order
    if is_used is not None:
        c.is_used = is_used
    db.commit()
    db.refresh(c)
    return c


def soft_delete_category(db: Session, category_id: int) -> Category | None:
    """카테고리 소프트 삭제."""
    c = get_category_by_id(db, category_id, include_deleted=False)
    if not c:
        return None
    c.deleted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(c)
    return c


def restore_category(db: Session, category_id: int) -> Category | None:
    """카테고리 복원."""
    c = get_category_by_id(db, category_id, include_deleted=True)
    if not c or c.deleted_at is None:
        return None
    c.deleted_at = None
    db.commit()
    db.refresh(c)
    return c
