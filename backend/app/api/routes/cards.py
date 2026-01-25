"""
카드 관련 API 라우터
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.schemas.card import (
    CardGenerationRequestSchema,
    CardGenerationResponseSchema,
    CardSaveRequestSchema,
    CardSaveResponseSchema,
    CardListResponseSchema,
    CardResponseSchema,
    CardDeleteResponseSchema,
)
from app.services.card_service import CardService
from app.database.database import get_db

router = APIRouter(prefix="/cards", tags=["cards"])

card_service = CardService()


@router.post("/generate", response_model=CardGenerationResponseSchema)
async def generate_card(request: CardGenerationRequestSchema):
    """
    카드 생성 요청을 처리합니다.
    
    - **cardData**: 카드 기본 정보 (카드명, 타입, 속성, 등급 등)
    - **characterImageUrl**: 캐릭터 이미지 URL (선택)
    - **backgroundImageUrl**: 배경 이미지 URL (선택)
    
    현재는 프롬프트만 생성하고, 추후 AI 이미지 생성 기능을 추가할 예정입니다.
    """
    try:
        # 카드 데이터 검증
        is_valid, error_message = card_service.validate_card_data(request.cardData)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_message)
        
        # 프롬프트 생성
        prompt = card_service.generate_prompt(request)
        
        return CardGenerationResponseSchema(
            success=True,
            message="카드 생성 요청이 성공적으로 처리되었습니다.",
            prompt=prompt
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"카드 생성 중 오류가 발생했습니다: {str(e)}"
        )


@router.post("/save", response_model=CardSaveResponseSchema)
async def save_card(request: CardSaveRequestSchema, db: Session = Depends(get_db)):
    """
    카드 정보를 데이터베이스에 저장합니다.
    
    - **cardData**: 카드 기본 정보 (카드명, 타입, 속성, 등급 등)
    - **characterImageUrl**: 캐릭터 이미지 URL (선택)
    - **backgroundImageUrl**: 배경 이미지 URL (선택)
    - **generatedPrompt**: 생성된 프롬프트 (선택)
    - **generatedImageUrl**: 생성된 이미지 URL (선택)
    """
    try:
        # 카드 데이터 검증
        is_valid, error_message = card_service.validate_card_data(request.cardData)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_message)
        
        # 카드 저장
        card = card_service.save_card(db, request)
        
        return CardSaveResponseSchema(
            success=True,
            message="카드가 성공적으로 저장되었습니다.",
            cardSn=card.card_sn
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"카드 저장 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/list", response_model=CardListResponseSchema)
async def get_cards(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    카드 목록을 조회합니다.
    
    - **skip**: 건너뛸 개수 (페이지네이션)
    - **limit**: 가져올 최대 개수 (기본값: 100)
    """
    try:
        cards, total = card_service.get_all_cards(db, skip=skip, limit=limit)
        
        # 카드 모델을 응답 스키마로 변환
        card_list = []
        for card in cards:
            card_list.append(CardResponseSchema(
                cardSn=card.card_sn,
                cardNumber=card.card_number,
                cardName=card.card_name,
                type=card.type,
                attribute=card.attribute,
                rarity=card.rarity,
                attack=card.attack or "0",
                health=card.health or "0",
                skill1Name=card.skill1_name,
                skill1Description=card.skill1_description,
                skill2Name=card.skill2_name,
                skill2Description=card.skill2_description,
                flavorText=card.flavor_text,
                series=card.series,
                characterImageUrl=card.character_image_url,
                backgroundImageUrl=card.background_image_url,
                generatedPrompt=card.generated_prompt,
                generatedImageUrl=card.generated_image_url,
                createdAt=card.created_at.isoformat() if card.created_at else "",
                updatedAt=card.updated_at.isoformat() if card.updated_at else "",
            ))
        
        return CardListResponseSchema(
            success=True,
            total=total,
            cards=card_list
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"카드 목록 조회 중 오류가 발생했습니다: {str(e)}"
        )


@router.delete("/{card_sn}", response_model=CardDeleteResponseSchema)
async def delete_card(card_sn: int, db: Session = Depends(get_db)):
    """
    카드를 삭제합니다.
    
    - **card_sn**: 삭제할 카드의 일련번호
    """
    try:
        # 카드 삭제
        success = card_service.delete_card(db, card_sn)
        
        if not success:
            raise HTTPException(
                status_code=404,
                detail=f"카드 일련번호 {card_sn}에 해당하는 카드를 찾을 수 없습니다."
            )
        
        return CardDeleteResponseSchema(
            success=True,
            message="카드가 성공적으로 삭제되었습니다."
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"카드 삭제 중 오류가 발생했습니다: {str(e)}"
        )
