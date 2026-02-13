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
from app.schemas.flow import (
    NoblePhantasmGenerateRequest,
    NoblePhantasmGenerateResponse,
    FlavorTextGenerateRequest,
    FlavorTextGenerateResponse,
    CardDataGenerateRequest,
    CardDataGenerateResponse,
    ImageEditRequest,
    ImageEditResponse,
)
from app.services.lore_service import run_lore_mapping
from app.services.flow_card_service import FlowCardService
from app.services.image_prompt_service import (
    run_image_prompt_generator,
    run_prompt_postprocess,
)
from app.services.noble_phantasm_service import (
    generate_noble_phantasm,
    generate_flavor_text,
    generate_card_data,
)
from app.services.image_edit_service import run_image_edit
from app.services.api_usage_log_service import (
    log_api_usage,
    OPERATION_POST_CREATION,
    OPERATION_IMAGE_GENERATION,
    GPT_IMAGE_15_PER_IMAGE_USD,
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
        lore_result, usage = await run_lore_mapping(name=name, description=description)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Lore 분석 중 오류가 발생했습니다: {e}",
        )

    if usage:
        log_api_usage(
            db,
            OPERATION_POST_CREATION,
            model="gpt-4o-mini",
            input_tokens=usage.get("input_tokens"),
            output_tokens=usage.get("output_tokens"),
            user_id=current_user.id,
            extra={"endpoint": "lore-mapping", "character_id": body.character_id},
        )
        db.commit()

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
                promptGenerationStatus=card.prompt_generation_status,
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
        promptGenerationStatus=card.prompt_generation_status,
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
    from app.database.models import FlowCard
    
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
    
    # 해당 조합의 FlowCard 찾기 및 상태를 'requested'로 설정
    card = FlowCardService.find_card_by_character_and_attributes(
        db=db,
        character_id=request.characterId,
        gender=request.gender,
        attribute=request.attribute,
        type_val=request.type,
    )
    
    if card:
        # 프롬프트 생성 요청 상태로 설정
        FlowCardService.update_card(
            db=db,
            card_id=card.id,
            prompt_generation_status='requested',
        )
    
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
        image_prompt, character_settings, usage = await run_image_prompt_generator(
            lore=lore,
            gender=request.gender,
            attribute=request.attribute,
            type=request.type,
        )

        if usage:
            log_api_usage(
                db,
                OPERATION_POST_CREATION,
                model="gpt-4o-mini",
                input_tokens=usage.get("input_tokens"),
                output_tokens=usage.get("output_tokens"),
                user_id=current_user.id,
                extra={"endpoint": "image-prompt", "character_id": request.characterId},
            )
            db.commit()

        # 후처리
        final_prompt, final_character_settings = run_prompt_postprocess(image_prompt, character_settings)

        return ImagePromptResponse(
            success=True,
            prompt=final_prompt.landscape_image_prompt_en,
            negativePrompt=final_prompt.negative_prompt_en,
            characterSettings=final_character_settings,  # 캐릭터 설정 정보 포함
        )
    except ValueError as e:
        # 에러 발생 시 상태를 null로 리셋
        if card:
            FlowCardService.update_card(
                db=db,
                card_id=card.id,
                prompt_generation_status=None,
            )
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # 에러 발생 시 상태를 null로 리셋
        if card:
            FlowCardService.update_card(
                db=db,
                card_id=card.id,
                prompt_generation_status=None,
            )
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
    
    # 프롬프트가 저장되는 경우 상태를 'completed'로 설정
    prompt_generation_status = None
    if request.prompt is not None:
        prompt_generation_status = 'completed'
    
    updated_card = FlowCardService.update_card(
        db=db,
        card_id=card_id,
        prompt=request.prompt,
        negative_prompt=request.negativePrompt,
        image_url=request.imageUrl,
        prompt_generation_status=prompt_generation_status,
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
        # 워크스페이스 기준 디렉토리 구성: flow_cards/user_{user_id}/workspace_{workspace_id}/
        from app.database.models import Flow  # 지연 import로 순환 참조 방지

        workspace_id = None
        if character.flow_id:
            flow = db.query(Flow).filter(Flow.id == character.flow_id).first()
            if flow and flow.workspace_id:
                workspace_id = flow.workspace_id

        if workspace_id is not None:
            subdirectory = f"flow_cards/user_{current_user.id}/workspace_{workspace_id}"
        else:
            # 워크스페이스 정보를 찾지 못한 경우 fallback
            subdirectory = f"flow_cards/user_{current_user.id}/workspace_unknown"

        file_url, file_path = await save_uploaded_file(
            file,
            subdirectory=subdirectory,
            filename_prefix=f"card_{card_id}_",
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


@router.post("/noble-phantasm/generate", response_model=NoblePhantasmGenerateResponse)
async def generate_noble_phantasm_endpoint(
    request: NoblePhantasmGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """
    보구 생성.
    캐릭터의 세계관 설정과 카드 설정을 기반으로 보구명과 진명개방을 생성합니다.
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
        # 보구 생성
        result, usage = await generate_noble_phantasm(
            lore=lore,
            gender=request.gender,
            attribute=request.attribute,
            type=request.type,
            exclude_noble_phantasms=request.excludeNoblePhantasms,
        )

        if usage:
            log_api_usage(
                db,
                OPERATION_POST_CREATION,
                model="gpt-4o-mini",
                input_tokens=usage.get("input_tokens"),
                output_tokens=usage.get("output_tokens"),
                user_id=current_user.id,
                extra={"endpoint": "noble-phantasm", "character_id": request.characterId},
            )
            db.commit()

        return NoblePhantasmGenerateResponse(
            success=True,
            보구명=result.보구명,
            진명개방=result.진명개방,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"보구 생성 중 오류가 발생했습니다: {str(e)}",
        )


@router.post("/flavor-text/generate", response_model=FlavorTextGenerateResponse)
async def generate_flavor_text_endpoint(
    request: FlavorTextGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """
    플레이버 텍스트 생성.
    캐릭터의 세계관 설정과 카드 설정을 기반으로 캐릭터의 말투를 반영한 대사를 생성합니다.
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
        # 플레이버 텍스트 생성
        result, usage = await generate_flavor_text(
            lore=lore,
            gender=request.gender,
            attribute=request.attribute,
            type=request.type,
        )

        if usage:
            log_api_usage(
                db,
                OPERATION_POST_CREATION,
                model="gpt-4o-mini",
                input_tokens=usage.get("input_tokens"),
                output_tokens=usage.get("output_tokens"),
                user_id=current_user.id,
                extra={"endpoint": "flavor-text", "character_id": request.characterId},
            )
            db.commit()

        return FlavorTextGenerateResponse(
            success=True,
            flavorText=result.flavorText,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"플레이버 텍스트 생성 중 오류가 발생했습니다: {str(e)}",
        )


@router.post("/image-edit", response_model=ImageEditResponse)
def image_edit_endpoint(
    request: ImageEditRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """
    OpenAI images.edit API로 이미지 자동 생성.
    카드 미리보기 이미지(base64)와 카드생성 프롬프트를 받아 이미지를 생성합니다.
    """
    import base64 as b64

    raw = request.imageBase64.strip()
    if raw.startswith("data:"):
        # data:image/png;base64,xxxx 제거
        raw = raw.split(",", 1)[-1]
    try:
        image_bytes = b64.b64decode(raw)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"이미지 base64 디코딩 실패: {e}")

    if not request.prompt or not request.prompt.strip():
        raise HTTPException(status_code=400, detail="프롬프트를 입력해 주세요.")

    try:
        image_base64 = run_image_edit(image_bytes=image_bytes, prompt=request.prompt.strip())
        log_api_usage(
            db,
            OPERATION_IMAGE_GENERATION,
            model="gpt-image-1.5",
            cost_usd=GPT_IMAGE_15_PER_IMAGE_USD,
            user_id=current_user.id,
            extra={"endpoint": "image-edit"},
        )
        db.commit()
        return ImageEditResponse(success=True, imageBase64=image_base64)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"이미지 생성 중 오류가 발생했습니다: {str(e)}",
        )


@router.post("/card-data/generate", response_model=CardDataGenerateResponse)
async def generate_card_data_endpoint(
    request: CardDataGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """
    카드 데이터 일괄 생성 (보구1, 보구2, 플레이버 텍스트).
    한 번에 모든 데이터를 생성합니다.
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
        # 카드 데이터 일괄 생성
        result, usage = await generate_card_data(
            lore=lore,
            gender=request.gender,
            attribute=request.attribute,
            type=request.type,
            exclude_noble_phantasms=request.excludeNoblePhantasms,
        )

        if usage:
            log_api_usage(
                db,
                OPERATION_POST_CREATION,
                model="gpt-4o-mini",
                input_tokens=usage.get("input_tokens"),
                output_tokens=usage.get("output_tokens"),
                user_id=current_user.id,
                extra={"endpoint": "card-data/generate", "character_id": request.characterId},
            )
            db.commit()

        return CardDataGenerateResponse(
            success=True,
            noblePhantasm1=result["noblePhantasm1"],
            noblePhantasm2=result["noblePhantasm2"],
            flavorText=result["flavorText"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"카드 데이터 생성 중 오류가 발생했습니다: {str(e)}",
        )
