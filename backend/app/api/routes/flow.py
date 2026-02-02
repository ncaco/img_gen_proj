"""
플로우 관련 API: Lore(세계관) 분석 등.
Run 시 캐릭터 정보로 테이블 레코드 생성 후 GPT 결과로 업데이트.
"""
from fastapi import APIRouter, Depends, HTTPException, status

from sqlalchemy.orm import Session

from app.api.routes.auth import get_current_user_required
from app.database.database import get_db
from app.database.models import User, FlowCharacter
from app.schemas.lore import LoreMappingRequest, LoreMappingResult, lore_mapping_to_response
from app.services.lore_service import run_lore_mapping

router = APIRouter(prefix="/flow", tags=["flow"])


def _apply_lore_to_character(character: FlowCharacter, lore: LoreMappingResult) -> None:
    """GPT 결과를 FlowCharacter 컬럼에 반영."""
    character.historical_or_mythical = lore.historical_or_mythical
    character.origin_country = lore.origin_country
    character.era = lore.era
    character.main_archetype = lore.main_archetype
    character.legend_rank = lore.legend_rank
    character.mystery_level = lore.mystery_level
    character.divinity_potential = lore.divinity_potential
    character.iconic_weapons_or_symbols = lore.iconic_weapons_or_symbols
    character.key_achievements = lore.key_achievements
    character.suitable_for_pretender = 1 if lore.suitable_for_pretender else 0
    character.suitable_for_foreigner = 1 if lore.suitable_for_foreigner else 0


@router.post("/lore-mapping")
async def lore_mapping(
    body: LoreMappingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """
    캐릭터 정보(이름·설명)로 세계관 분석 실행.
    - character_id 없음: 새 레코드 생성 → GPT 실행 → 결과로 업데이트 → 키 반환.
    - character_id 있음: 해당 레코드의 이름·설명 갱신 → GPT 실행 → 결과로 업데이트.
    """
    name = body.name.strip()
    description = (body.description or "").strip()

    try:
        lore_result = run_lore_mapping(name=name, description=description)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Lore 분석 중 오류가 발생했습니다: {e}",
        )

    if body.character_id:
        character = db.query(FlowCharacter).filter(
            FlowCharacter.id == body.character_id,
            FlowCharacter.user_id == current_user.id,
        ).first()
        if not character:
            raise HTTPException(status_code=404, detail="해당 캐릭터를 찾을 수 없습니다.")
        character.name = name
        character.description = description or None
        _apply_lore_to_character(character, lore_result)
        db.commit()
        db.refresh(character)
        character_id = character.id
    else:
        character = FlowCharacter(
            name=name,
            description=description or None,
            flow_id=body.flow_id,
            user_id=current_user.id,
        )
        db.add(character)
        db.flush()
        _apply_lore_to_character(character, lore_result)
        db.commit()
        db.refresh(character)
        character_id = character.id

    return {
        "success": True,
        "data": lore_mapping_to_response(lore_result),
        "characterId": character_id,
    }
