"""
영웅 풀오토 API

한 명의 플로우 캐릭터에 대해 10개의 서번트 슬롯(10각형)을 자동 배분/확정하는 기능을 제공합니다.
"""
import random
import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.routes.auth import get_current_user_required
from app.database.database import get_db
from app.database.models import (
    User,
    HeroAutoPool,
    FlowCharacter,
    CategoryType,
    Category,
)
from app.schemas.hero_auto import (
    HeroAutoPoolCreateSchema,
    HeroAutoPoolListItemSchema,
    HeroAutoPoolResponseSchema,
    HeroAutoDistributeRequestSchema,
    HeroAutoDistributeResponseSchema,
    HeroAutoConfirmResponseSchema,
    ServantSlotSchema,
)

router = APIRouter(prefix="/hero-auto", tags=["hero-auto"])


def _to_response(pool: HeroAutoPool) -> HeroAutoPoolResponseSchema:
    servants_raw = pool.servants or []
    servants = [
        ServantSlotSchema(
            position=item.get("position"),
            gender=item.get("gender"),
            attribute=item.get("attribute"),
            type=item.get("type"),
        )
        for item in servants_raw
        if isinstance(item, dict)
    ]
    return HeroAutoPoolResponseSchema(
        id=pool.id,
        characterId=pool.character_id,
        servants=servants,
        isConfirmed=bool(pool.is_confirmed),
    )


@router.get("", response_model=list[HeroAutoPoolListItemSchema])
async def list_hero_auto_pools(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """
    현재 사용자의 영웅 풀오토 풀 목록 조회. 최신순.
    """
    pools = (
        db.query(HeroAutoPool)
        .filter(HeroAutoPool.user_id == current_user.id)
        .order_by(HeroAutoPool.updated_at.desc(), HeroAutoPool.id.desc())
        .all()
    )
    result = []
    for p in pools:
        character = (
            db.query(FlowCharacter)
            .filter(
                FlowCharacter.id == p.character_id,
                FlowCharacter.user_id == current_user.id,
            )
            .first()
        )
        result.append(
            HeroAutoPoolListItemSchema(
                id=p.id,
                characterId=p.character_id,
                characterName=character.name if character else None,
                isConfirmed=bool(p.is_confirmed),
            )
        )
    return result


@router.post("", response_model=HeroAutoPoolResponseSchema)
async def create_hero_auto_pool(
    body: HeroAutoPoolCreateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """
    영웅 풀오토 풀 생성.

    - 현재 사용자 + 선택한 FlowCharacter 기준으로 하나의 풀을 생성합니다.
    - 동일 사용자/캐릭터에 대해 여러 개의 풀을 허용하지만, 일반적으로는 최신 1개만 사용하게 됩니다.
    """
    # 캐릭터 소유권 확인
    character = (
        db.query(FlowCharacter)
        .filter(
            FlowCharacter.id == body.characterId,
            FlowCharacter.user_id == current_user.id,
        )
        .first()
    )
    if not character:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="해당 캐릭터를 찾을 수 없습니다."
        )

    pool = HeroAutoPool(
        user_id=current_user.id,
        character_id=body.characterId,
        servants=[],
        is_confirmed=0,
    )
    db.add(pool)
    db.commit()
    db.refresh(pool)
    return _to_response(pool)


@router.get("/{pool_id}", response_model=HeroAutoPoolResponseSchema)
async def get_hero_auto_pool(
    pool_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """
    영웅 풀오토 풀 조회.
    """
    pool = (
        db.query(HeroAutoPool)
        .filter(
            HeroAutoPool.id == pool_id,
            HeroAutoPool.user_id == current_user.id,
        )
        .first()
    )
    if not pool:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 풀오토 정보를 찾을 수 없습니다.",
        )
    return _to_response(pool)


@router.delete("/{pool_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_hero_auto_pool(
    pool_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """
    영웅 풀오토 풀 삭제. 본인 소유 풀만 삭제 가능.
    """
    pool = (
        db.query(HeroAutoPool)
        .filter(
            HeroAutoPool.id == pool_id,
            HeroAutoPool.user_id == current_user.id,
        )
        .first()
    )
    if not pool:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 풀오토 정보를 찾을 수 없습니다.",
        )
    db.delete(pool)
    db.commit()


def _get_category_names(db: Session, type_key: str, limit: int = 10) -> list[str]:
    """category_types / categories에서 type_key 기준 2뎁스 name 리스트를 최대 limit개 가져온다."""
    ctype = (
        db.query(CategoryType)
        .filter(
            CategoryType.type_key == type_key,
            CategoryType.deleted_at.is_(None),
            CategoryType.is_used == 1,
        )
        .first()
    )
    if not ctype:
        return []

    # 2뎁스 (parent_id NULL)
    q = (
        db.query(Category)
        .filter(
            Category.type_id == ctype.id,
            Category.parent_id.is_(None),
            Category.deleted_at.is_(None),
            Category.is_used == 1,
        )
        .order_by(Category.sort_order.asc(), Category.id.asc())
    )
    level2 = q.all()

    # 클래스만: 3뎁스(실제 클래스명)만 사용. 2뎁스는 그룹(일반/엑스트라 등)이므로 제외.
    if type_key == "class":
        if not level2:
            return []
        level3 = (
            db.query(Category)
            .filter(
                Category.parent_id.in_([c.id for c in level2]),
                Category.deleted_at.is_(None),
                Category.is_used == 1,
            )
            .order_by(Category.sort_order.asc(), Category.id.asc())
            .all()
        )
        # 2뎁스 순서 → 3뎁스 sort_order 순으로 이름 수집
        order_by_parent = {c.id: i for i, c in enumerate(level2)}
        names_3 = sorted(
            [(order_by_parent.get(c.parent_id, 999), c.sort_order, c.name) for c in level3]
        )
        names = [n for _, __, n in names_3]
        return names[:limit] if limit else names

    items = level2[:limit] if limit else level2
    return [c.name for c in items]


@router.post("/{pool_id}/distribute", response_model=HeroAutoDistributeResponseSchema)
async def distribute_hero_auto_pool(
    pool_id: int,
    body: HeroAutoDistributeRequestSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """
    속성/클래스를 10개 슬롯에 자동 배분.

    - 속성: 남>여>남>여 순으로 배분 (남성 슬롯 0,2,4,6,8 / 여성 슬롯 1,3,5,7,9)
    - 클래스: 여>남>여>남 순으로 배분 (여성 슬롯 먼저 1,3,5,7,9 / 남성 슬롯 0,2,4,6,8)
    - 실제 성별 텍스트(남/여)는 슬롯 정의에만 사용하고, 카테고리 이름은 그대로 사용.
    """
    pool = (
        db.query(HeroAutoPool)
        .filter(
            HeroAutoPool.id == pool_id,
            HeroAutoPool.user_id == current_user.id,
        )
        .first()
    )
    if not pool:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 풀오토 정보를 찾을 수 없습니다.",
        )

    if pool.is_confirmed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 확정된 풀오토는 재배분할 수 없습니다.",
        )

    # 카테고리에서 속성/클래스 목록 로드 (최대 10개)
    attributes = _get_category_names(db, "attribute", limit=10)
    classes = _get_category_names(db, "class", limit=10)

    # 전혀 없는 경우만 에러 처리 (1개 이상이면 재사용해서 10칸 채움)
    if not attributes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="속성 카테고리가 하나도 없습니다. 관리자에서 속성을 추가해 주세요.",
        )
    if not classes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="클래스 카테고리가 하나도 없습니다. 관리자에서 클래스를 추가해 주세요.",
        )

    # 10개 미만이어도 N개를 반복해서 10개까지 채운다.
    def _expand_to_10(names: list[str]) -> list[str]:
        if len(names) >= 10:
            return names[:10]
        result: list[str] = []
        i = 0
        while len(result) < 10:
            result.append(names[i % len(names)])
            i += 1
        return result

    attributes_10 = _expand_to_10(attributes)
    classes_10 = _expand_to_10(classes)

    # 매번 다른 배정을 위해 랜덤 시드 생성 (요청마다 새 시드)
    seed = secrets.randbits(64)
    rng = random.Random(seed)

    # 10개 슬롯 기본 구조 (0~9, 성별 고정: 짝수=남, 홀수=여)
    slots: list[dict] = []
    for pos in range(10):
        gender = "남성" if pos % 2 == 0 else "여성"
        slots.append(
            {
                "position": pos,
                "gender": gender,
                "attribute": None,
                "type": None,
            }
        )

    # --- 속성/클래스: 전체 10개를 한 번에 셔플해 슬롯 0~9에 랜덤 배정 (더 다양한 조합) ---
    shuffled_attrs = attributes_10.copy()
    rng.shuffle(shuffled_attrs)
    shuffled_classes = classes_10.copy()
    rng.shuffle(shuffled_classes)
    for pos in range(10):
        slots[pos]["attribute"] = shuffled_attrs[pos]
        slots[pos]["type"] = shuffled_classes[pos]

    pool.servants = slots
    pool.is_confirmed = 0
    db.commit()
    db.refresh(pool)

    return HeroAutoDistributeResponseSchema(success=True, pool=_to_response(pool))


@router.patch("/{pool_id}/confirm", response_model=HeroAutoConfirmResponseSchema)
async def confirm_hero_auto_pool(
    pool_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """
    풀오토 결과 확정.
    - 확정 후에는 distribute/regenerate 호출이 불가능합니다.
    """
    pool = (
        db.query(HeroAutoPool)
        .filter(
            HeroAutoPool.id == pool_id,
            HeroAutoPool.user_id == current_user.id,
        )
        .first()
    )
    if not pool:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 풀오토 정보를 찾을 수 없습니다.",
        )

    if pool.is_confirmed:
        # 이미 확정된 경우에도 200으로 현재 상태만 반환
        return HeroAutoConfirmResponseSchema(success=True, pool=_to_response(pool))

    pool.is_confirmed = 1
    db.commit()
    db.refresh(pool)
    return HeroAutoConfirmResponseSchema(success=True, pool=_to_response(pool))


@router.patch("/{pool_id}/regenerate", response_model=HeroAutoConfirmResponseSchema)
async def regenerate_hero_auto_pool(
    pool_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """
    풀오토 결과 초기화 (재생성 전 상태로 되돌리기).
    - servants를 비우고 is_confirmed를 0으로 되돌립니다.
    - 이미 확정된 풀은 재생성할 수 없습니다.
    """
    pool = (
        db.query(HeroAutoPool)
        .filter(
            HeroAutoPool.id == pool_id,
            HeroAutoPool.user_id == current_user.id,
        )
        .first()
    )
    if not pool:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 풀오토 정보를 찾을 수 없습니다.",
        )

    if pool.is_confirmed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 확정된 풀오토는 재생성할 수 없습니다.",
        )

    pool.servants = []
    pool.is_confirmed = 0
    db.commit()
    db.refresh(pool)
    return HeroAutoConfirmResponseSchema(success=True, pool=_to_response(pool))

