"""
2·3·4뎁스: 카테고리 항목 비즈니스 로직. parent_id NULL = 2뎁스, parent_id 설정 = 3·4뎁스.
"""
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.database.models import Category
from app.services.category_type_service import list_category_types, get_category_type_by_id


def list_categories(
    db: Session,
    type_id: int | None = None,
    parent_id: int | None = None,
    all_depths: bool = False,
    include_deleted: bool = False,
    include_unused: bool = True,
) -> list[Category]:
    """
    카테고리 목록 조회.
    - type_id: 1뎁스 타입 ID (2뎁스 필터 시 사용)
    - parent_id: 상위 ID. None이면 2뎁스만, 값이 있으면 해당 하위(3·4뎁스)
    - all_depths: True이고 parent_id 없으면 2·3·4뎁스 전부 반환 (관리자 목록용)
    - include_deleted / include_unused: 포함 여부
    """
    q = db.query(Category)
    if parent_id is not None:
        q = q.filter(Category.parent_id == parent_id)
    elif not all_depths:
        q = q.filter(Category.parent_id.is_(None))
        if type_id is not None:
            q = q.filter(Category.type_id == type_id)
    if not include_deleted:
        q = q.filter(Category.deleted_at.is_(None))
    if not include_unused:
        q = q.filter(Category.is_used == 1)
    q = q.order_by(Category.sort_order.asc(), Category.id.asc())
    return q.all()


def _build_category_tree_under(db: Session, parent_id: int) -> list[dict]:
    """parent_id 하위 3·4뎁스 재귀 트리. [{ name, children: [...] }, ...]"""
    items = list_categories(db, parent_id=parent_id, include_deleted=False, include_unused=False)
    return [{"name": c.name, "children": _build_category_tree_under(db, c.id)} for c in items]


def list_categories_for_flow(db: Session) -> dict:
    """
    플로우/입력 파라미터용: 사용중·미삭제인 1뎁스별 2뎁스 name 리스트 + type_key_tree(2·3·4뎁스 트리).
    """
    types = list_category_types(db, include_deleted=False, include_unused=False)
    result = {}
    for t in types:
        items = list_categories(db, type_id=t.id, parent_id=None, include_deleted=False, include_unused=False)
        result[t.type_key] = [c.name for c in items]
        result[f"{t.type_key}_tree"] = [
            {"name": c.name, "children": _build_category_tree_under(db, c.id)} for c in items
        ]
    return result


def _get_root_type_id_and_key(db: Session, category: Category) -> tuple[int | None, str]:
    """상위로 타고 올라가 2뎁스의 type_id, type_key 반환."""
    c = category
    while c:
        if c.type_id is not None:
            t = get_category_type_by_id(db, c.type_id, include_deleted=True)
            return (c.type_id, t.type_key if t else (c.type or ""))
        if c.parent_id is None:
            break
        c = db.query(Category).filter(Category.id == c.parent_id).first()
    return (None, "")


def get_category_by_id(db: Session, category_id: int, include_deleted: bool = False) -> Category | None:
    """ID로 카테고리 조회."""
    q = db.query(Category).filter(Category.id == category_id)
    if not include_deleted:
        q = q.filter(Category.deleted_at.is_(None))
    return q.first()


def create_category(
    db: Session,
    type_id: int | None = None,
    parent_id: int | None = None,
    name: str = "",
    sort_order: int = 0,
    is_used: int = 1,
) -> Category:
    """
    카테고리 생성.
    - 2뎁스: type_id 설정, parent_id None
    - 3·4뎁스: parent_id 설정, type_id/type_key는 상위에서 상속
    """
    if parent_id is not None:
        parent = get_category_by_id(db, parent_id, include_deleted=True)
        if not parent:
            raise ValueError("상위 카테고리를 찾을 수 없습니다.")
        root_type_id, type_key = _get_root_type_id_and_key(db, parent)
        if root_type_id is None:
            raise ValueError("상위 카테고리에 type_id가 없습니다.")
        c = Category(
            type_id=root_type_id,
            parent_id=parent_id,
            type=type_key,
            name=name.strip(),
            sort_order=sort_order,
            is_used=is_used,
        )
    else:
        if type_id is None:
            raise ValueError("2뎁스 생성 시 type_id가 필요합니다.")
        t = get_category_type_by_id(db, type_id, include_deleted=True)
        type_key = t.type_key if t else ""
        c = Category(
            type_id=type_id,
            parent_id=None,
            type=type_key,
            name=name.strip(),
            sort_order=sort_order,
            is_used=is_used,
        )
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


def move_category_order(db: Session, category_id: int, direction: str) -> Category | None:
    """
    카테고리 정렬순서 변경 (위/아래 이동).
    같은 부모/타입 내에서만 이동 가능.
    direction: 'up' 또는 'down'
    """
    c = get_category_by_id(db, category_id, include_deleted=False)
    if not c:
        return None
    
    # 같은 부모/타입을 가진 카테고리 목록 가져오기
    if c.parent_id is not None:
        # 3·4뎁스: 같은 parent_id를 가진 것들
        siblings = list_categories(db, parent_id=c.parent_id, include_deleted=False, include_unused=True)
    elif c.type_id is not None:
        # 2뎁스: 같은 type_id를 가진 것들
        siblings = list_categories(db, type_id=c.type_id, include_deleted=False, include_unused=True)
    else:
        return None
    
    # 현재 카테고리의 인덱스 찾기
    current_index = None
    for i, item in enumerate(siblings):
        if item.id == category_id:
            current_index = i
            break
    
    if current_index is None:
        return None
    
    # 위로 이동
    if direction == 'up':
        if current_index == 0:
            return c  # 이미 맨 위
        target_index = current_index - 1
    # 아래로 이동
    elif direction == 'down':
        if current_index == len(siblings) - 1:
            return c  # 이미 맨 아래
        target_index = current_index + 1
    else:
        raise ValueError("direction은 'up' 또는 'down'이어야 합니다.")
    
    # 정렬순서 교환
    target_category = siblings[target_index]
    c.sort_order, target_category.sort_order = target_category.sort_order, c.sort_order
    
    db.commit()
    db.refresh(c)
    return c
