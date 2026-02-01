"""
1뎁스: 카테고리 타입(성별/클래스/속성 등) 비즈니스 로직. 소프트 삭제 및 사용여부 지원.
"""
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.database.models import CategoryType


def list_category_types(
    db: Session,
    include_deleted: bool = False,
    include_unused: bool = True,
) -> list[CategoryType]:
    """카테고리 타입 목록 (정렬순서·id 순)."""
    q = db.query(CategoryType)
    if not include_deleted:
        q = q.filter(CategoryType.deleted_at.is_(None))
    if not include_unused:
        q = q.filter(CategoryType.is_used == 1)
    q = q.order_by(CategoryType.sort_order.asc(), CategoryType.id.asc())
    return q.all()


def get_category_type_by_id(db: Session, type_id: int, include_deleted: bool = False) -> CategoryType | None:
    """ID로 카테고리 타입 조회."""
    q = db.query(CategoryType).filter(CategoryType.id == type_id)
    if not include_deleted:
        q = q.filter(CategoryType.deleted_at.is_(None))
    return q.first()


def get_category_type_by_key(db: Session, type_key: str, include_deleted: bool = False) -> CategoryType | None:
    """type_key로 카테고리 타입 조회."""
    q = db.query(CategoryType).filter(CategoryType.type_key == type_key)
    if not include_deleted:
        q = q.filter(CategoryType.deleted_at.is_(None))
    return q.first()


def create_category_type(
    db: Session,
    type_key: str,
    name: str,
    sort_order: int = 0,
    is_used: int = 1,
) -> CategoryType:
    """카테고리 타입 생성. type_key는 영문/숫자 등 고유값."""
    type_key = type_key.strip().lower().replace(" ", "_")
    if get_category_type_by_key(db, type_key, include_deleted=True):
        raise ValueError(f"type_key '{type_key}' 가 이미 존재합니다.")
    t = CategoryType(type_key=type_key, name=name.strip(), sort_order=sort_order, is_used=is_used)
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


def update_category_type(
    db: Session,
    type_id: int,
    type_key: str | None = None,
    name: str | None = None,
    sort_order: int | None = None,
    is_used: int | None = None,
) -> CategoryType | None:
    """카테고리 타입 수정 (관리자용)."""
    t = get_category_type_by_id(db, type_id, include_deleted=True)
    if not t:
        return None
    if type_key is not None:
        type_key = type_key.strip().lower().replace(" ", "_")
        other = get_category_type_by_key(db, type_key, include_deleted=True)
        if other and other.id != type_id:
            raise ValueError(f"type_key '{type_key}' 가 이미 존재합니다.")
        t.type_key = type_key
    if name is not None:
        t.name = name.strip()
    if sort_order is not None:
        t.sort_order = sort_order
    if is_used is not None:
        t.is_used = is_used
    db.commit()
    db.refresh(t)
    return t


def soft_delete_category_type(db: Session, type_id: int) -> CategoryType | None:
    """카테고리 타입 소프트 삭제."""
    t = get_category_type_by_id(db, type_id, include_deleted=False)
    if not t:
        return None
    t.deleted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(t)
    return t


def restore_category_type(db: Session, type_id: int) -> CategoryType | None:
    """카테고리 타입 복원."""
    t = get_category_type_by_id(db, type_id, include_deleted=True)
    if not t or t.deleted_at is None:
        return None
    t.deleted_at = None
    db.commit()
    db.refresh(t)
    return t
