"""
카드 관련 API 라우터
"""
from fastapi import APIRouter, HTTPException
from app.schemas.card import (
    CardGenerationRequestSchema,
    CardGenerationResponseSchema,
)
from app.services.card_service import CardService

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
