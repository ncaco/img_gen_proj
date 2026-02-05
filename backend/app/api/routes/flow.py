"""
플로우 관련 API: Lore(세계관) 분석 등.
Run 시 캐릭터 정보로 테이블 레코드 생성 후 GPT 결과로 업데이트.
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File

from sqlalchemy.orm import Session

from app.api.routes.auth import get_current_user_required
from app.database.database import get_db
from app.database.models import User, FlowCharacter
from app.utils.file_utils import save_uploaded_file
from app.schemas.lore import (
    LoreMappingRequest,
    LoreMappingResult,
    lore_mapping_to_response,
    FlowCharacterResponseSchema,
    FlowCharacterListResponseSchema,
    FlowCharacterDetailResponseSchema,
)
from app.schemas.flow_card import (
    FlowCardGenerateRequestSchema,
    FlowCardGenerateResponseSchema,
    FlowCardListResponseSchema,
    FlowCardResponseSchema,
    FlowCardUpdateRequestSchema,
    FlowCardUpdateResponseSchema,
)
from app.schemas.image_prompt import (
    ImagePromptRequest,
    ImagePromptResponse,
)
from app.services.lore_service import run_lore_mapping
from app.services.flow_card_service import FlowCardService
from app.services.image_prompt_service import (
    run_image_prompt_generator,
    run_prompt_postprocess,
)

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
    character.noble_phantasms = lore.noble_phantasms
    character.key_achievements = lore.key_achievements


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


@router.get("/characters", response_model=FlowCharacterListResponseSchema)
async def list_characters(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """
    현재 사용자의 FlowCharacter 목록 조회 (id, name만 반환).
    """
    characters = (
        db.query(FlowCharacter)
        .filter(FlowCharacter.user_id == current_user.id)
        .order_by(FlowCharacter.created_at.desc())
        .all()
    )
    
    return {
        "success": True,
        "total": len(characters),
        "characters": [
            FlowCharacterResponseSchema(id=char.id, name=char.name)
            for char in characters
        ],
    }


@router.get("/characters/{character_id}", response_model=FlowCharacterDetailResponseSchema)
async def get_character(
    character_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """
    캐릭터 상세 정보 조회.
    """
    character = (
        db.query(FlowCharacter)
        .filter(
            FlowCharacter.id == character_id,
            FlowCharacter.user_id == current_user.id,
        )
        .first()
    )
    
    if not character:
        raise HTTPException(status_code=404, detail="해당 캐릭터를 찾을 수 없습니다.")
    
    return FlowCharacterDetailResponseSchema(
        id=character.id,
        name=character.name,
        description=character.description,
        historicalOrMythical=character.historical_or_mythical,
        originCountry=character.origin_country,
        era=character.era,
        mainArchetype=character.main_archetype,
        legendRank=character.legend_rank,
        mysteryLevel=character.mystery_level,
        divinityPotential=character.divinity_potential,
        noblePhantasms=character.noble_phantasms or [],
        keyAchievements=character.key_achievements or [],
    )


@router.post("/characters/{character_id}/cards/generate", response_model=FlowCardGenerateResponseSchema)
async def generate_flow_cards(
    character_id: int,
    request: FlowCardGenerateRequestSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """
    캐릭터에 대한 모든 조합의 FlowCard 생성.
    유니크 키: character_id + gender + attribute + type
    """
    # 캐릭터 소유권 확인
    character = (
        db.query(FlowCharacter)
        .filter(
            FlowCharacter.id == character_id,
            FlowCharacter.user_id == current_user.id,
        )
        .first()
    )
    
    if not character:
        raise HTTPException(status_code=404, detail="해당 캐릭터를 찾을 수 없습니다.")

    try:
        created, skipped = FlowCardService.generate_cards_for_character(
            db=db,
            character_id=character_id,
            genders=request.genders,
            attributes=request.attributes,
            types=request.types,
        )
        
        return FlowCardGenerateResponseSchema(
            success=True,
            message=f"{created}개의 카드가 생성되었습니다. {skipped}개의 카드는 이미 존재합니다.",
            created=created,
            skipped=skipped,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"카드 생성 중 오류가 발생했습니다: {str(e)}",
        )


@router.get("/characters/{character_id}/cards", response_model=FlowCardListResponseSchema)
async def get_flow_cards(
    character_id: int,
    gender: str | None = None,
    attribute: str | None = None,
    type_val: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """
    캐릭터의 FlowCard 목록 조회 (필터링 지원).
    """
    # 캐릭터 소유권 확인
    character = (
        db.query(FlowCharacter)
        .filter(
            FlowCharacter.id == character_id,
            FlowCharacter.user_id == current_user.id,
        )
        .first()
    )
    
    if not character:
        raise HTTPException(status_code=404, detail="해당 캐릭터를 찾을 수 없습니다.")

    cards = FlowCardService.get_cards_by_character(
        db=db,
        character_id=character_id,
        gender=gender,
        attribute=attribute,
        type_val=type_val,
    )

    return FlowCardListResponseSchema(
        success=True,
        total=len(cards),
        cards=[
            FlowCardResponseSchema(
                id=card.id,
                characterId=card.character_id,
                gender=card.gender,
                attribute=card.attribute,
                type=card.type,
                prompt=card.prompt,
                negativePrompt=card.negative_prompt,
                imageUrl=card.image_url,
                createdAt=card.created_at.isoformat() if card.created_at else "",
                updatedAt=card.updated_at.isoformat() if card.updated_at else "",
            )
            for card in cards
        ],
    )


@router.get("/cards/{card_id}", response_model=FlowCardResponseSchema)
async def get_flow_card(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """
    FlowCard 단건 조회.
    """
    from app.database.models import FlowCard
    
    card = db.query(FlowCard).filter(FlowCard.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="해당 카드를 찾을 수 없습니다.")
    
    # 캐릭터 소유권 확인
    character = (
        db.query(FlowCharacter)
        .filter(
            FlowCharacter.id == card.character_id,
            FlowCharacter.user_id == current_user.id,
        )
        .first()
    )
    
    if not character:
        raise HTTPException(status_code=404, detail="해당 카드를 찾을 수 없습니다.")
    
    return FlowCardResponseSchema(
        id=card.id,
        characterId=card.character_id,
        gender=card.gender,
        attribute=card.attribute,
        type=card.type,
        prompt=card.prompt,
        negativePrompt=card.negative_prompt,
        imageUrl=card.image_url,
        createdAt=card.created_at.isoformat() if card.created_at else "",
        updatedAt=card.updated_at.isoformat() if card.updated_at else "",
    )


@router.post("/image-prompt", response_model=ImagePromptResponse)
async def generate_image_prompt(
    request: ImagePromptRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """
    이미지 프롬프트 생성.
    캐릭터 설정 + 성별 + 속성 + 클래스를 기반으로 이미지 생성용 프롬프트를 생성합니다.
    """
    # 캐릭터 소유권 확인
    character = (
        db.query(FlowCharacter)
        .filter(
            FlowCharacter.id == request.characterId,
            FlowCharacter.user_id == current_user.id,
        )
        .first()
    )
    
    if not character:
        raise HTTPException(status_code=404, detail="해당 캐릭터를 찾을 수 없습니다.")
    
    # 캐릭터 정보를 LoreMappingResult로 변환
    # FlowCharacter의 정보를 사용하여 LoreMappingResult 생성
    lore = LoreMappingResult(
        name=character.name,
        historical_or_mythical=character.historical_or_mythical or "역사(Historical)",
        origin_country=character.origin_country,
        era=character.era or "현대(Modern)",
        main_archetype=character.main_archetype or "영령(Heroic Spirit)",
        legend_rank=character.legend_rank or "중간(Medium)",
        mystery_level=character.mystery_level or "현대(Modern)",
        divinity_potential=character.divinity_potential or "없음(None)",
        noble_phantasms=character.noble_phantasms or [],
        key_achievements=character.key_achievements or [],
    )
    
    try:
        # Image Prompt 생성
        image_prompt, character_settings = run_image_prompt_generator(
            lore=lore,
            gender=request.gender,
            attribute=request.attribute,
            type=request.type,
        )
        
        # 후처리
        final_prompt, final_character_settings = run_prompt_postprocess(image_prompt, character_settings)
        
        return ImagePromptResponse(
            success=True,
            prompt=final_prompt.landscape_image_prompt_en,
            negativePrompt=final_prompt.negative_prompt_en,
            characterSettings=final_character_settings,  # 캐릭터 설정 정보 포함
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"이미지 프롬프트 생성 중 오류가 발생했습니다: {str(e)}",
        )


@router.patch("/cards/{card_id}", response_model=FlowCardUpdateResponseSchema)
async def update_flow_card(
    card_id: int,
    request: FlowCardUpdateRequestSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """
    FlowCard 프롬프트 업데이트.
    """
    from app.database.models import FlowCard
    
    card = db.query(FlowCard).filter(FlowCard.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="해당 카드를 찾을 수 없습니다.")
    
    # 캐릭터 소유권 확인
    character = (
        db.query(FlowCharacter)
        .filter(
            FlowCharacter.id == card.character_id,
            FlowCharacter.user_id == current_user.id,
        )
        .first()
    )
    
    if not character:
        raise HTTPException(status_code=404, detail="해당 카드를 찾을 수 없습니다.")
    
    updated_card = FlowCardService.update_card(
        db=db,
        card_id=card_id,
        prompt=request.prompt,
        negative_prompt=request.negativePrompt,
        image_url=request.imageUrl,
    )
    
    if not updated_card:
        raise HTTPException(status_code=404, detail="카드 업데이트에 실패했습니다.")
    
    return FlowCardUpdateResponseSchema(
        success=True,
        message="카드가 업데이트되었습니다.",
    )


@router.post("/cards/{card_id}/image", response_model=FlowCardUpdateResponseSchema)
async def upload_flow_card_image(
    card_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """
    FlowCard 이미지 업로드 (16:9 비율 권장).
    """
    from app.database.models import FlowCard
    
    card = db.query(FlowCard).filter(FlowCard.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="해당 카드를 찾을 수 없습니다.")
    
    # 캐릭터 소유권 확인
    character = (
        db.query(FlowCharacter)
        .filter(
            FlowCharacter.id == card.character_id,
            FlowCharacter.user_id == current_user.id,
        )
        .first()
    )
    
    if not character:
        raise HTTPException(status_code=404, detail="해당 카드를 찾을 수 없습니다.")
    
    try:
        # 이미지 파일 업로드 (flow_cards 서브디렉토리에 저장)
        file_url, file_path = await save_uploaded_file(
            file,
            subdirectory="flow_cards",
            filename_prefix=f"card_{card_id}_"
        )
        
        # FlowCard에 이미지 URL 저장
        updated_card = FlowCardService.update_card(
            db=db,
            card_id=card_id,
            image_url=file_url,
        )
        
        if not updated_card:
            raise HTTPException(status_code=404, detail="카드 업데이트에 실패했습니다.")
        
        return FlowCardUpdateResponseSchema(
            success=True,
            message="이미지가 업로드되었습니다.",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"이미지 업로드 중 오류가 발생했습니다: {str(e)}"
        )
