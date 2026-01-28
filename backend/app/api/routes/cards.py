"""
카드 관련 API 라우터
"""
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.schemas.card import (
    CardGenerationRequestSchema,
    CardGenerationResponseSchema,
    CardSaveRequestSchema,
    CardSaveResponseSchema,
    CardListResponseSchema,
    CardResponseSchema,
    CardDeleteResponseSchema,
    CardGeneratedImageUploadResponseSchema,
    CardGeneratedImageDeleteResponseSchema,
    CardGeneratedImageListResponseSchema,
)
from app.services.card_service import CardService
from app.database.database import get_db
from app.database.models import Card, CardGeneratedImage
from app.utils.file_utils import save_uploaded_file, get_file_path_from_url, delete_file

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

        # 카드별 최신 합성이미지 URL (합성 테이블 우선, 없으면 Card.generated_image_url)
        gen_rows = (
            db.query(CardGeneratedImage)
            .order_by(desc(CardGeneratedImage.created_at))
            .all()
        )
        # 카드별 최신 합성이미지 (가장 최근 1장)
        latest_gen_by_card: dict[int, str] = {}
        for row in gen_rows:
            if row.card_sn not in latest_gen_by_card:
                latest_gen_by_card[row.card_sn] = row.image_url

        # 카드 모델을 응답 스키마로 변환
        card_list = []
        for card in cards:
            # 최초 저장된 생성 이미지(초안)
            draft_url = card.generated_image_url
            # 합성이미지 중 가장 최신 1장을 generatedImageUrl 로 노출(없으면 초안 사용)
            gen_url = latest_gen_by_card.get(card.card_sn) or draft_url
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
                generatedImageUrl=gen_url,
                draftImageUrl=draft_url,
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


@router.post("/{card_sn}/generated-image", response_model=CardGeneratedImageUploadResponseSchema)
async def upload_card_generated_image(
    card_sn: int,
    file: UploadFile = File(..., description="합성이미지 파일"),
    db: Session = Depends(get_db)
):
    """
    해당 카드에 AI 합성이미지 파일을 업로드하고 합성카드 테이블에 연계합니다.
    파일은 해당 카드의 기본 이미지 경로 하위에 gen/ 디렉토리를 생성하여 gen_ 접두어가 붙은 파일명으로 저장됩니다.
    (예: /data/upload/{series}/{card_number}/gen/gen_xxx.png)
    """
    try:
        # 카드 존재 여부 확인
        card = db.query(Card).filter(Card.card_sn == card_sn).first()
        if not card:
            raise HTTPException(
                status_code=404,
                detail=f"카드 일련번호 {card_sn}에 해당하는 카드를 찾을 수 없습니다."
            )

        # 이 카드의 기본 이미지가 저장된 경로(/upload/{series}/{number})와 동일한 구조로 gen 디렉토리 생성
        series_name = card.series or "default"
        card_number = card.card_number or str(card.card_sn)

        # card_number에서 # 제거 및 특수문자 처리 (CardService.save_card와 동일한 로직)
        clean_number = card_number.replace("#", "").strip()
        safe_series = "".join(c for c in series_name if c.isalnum() or c in (" ", "-", "_")).strip()
        safe_series = safe_series.replace(" ", "_") if safe_series else "default"
        safe_number = "".join(c for c in clean_number if c.isalnum() or c in ("-", "_")).strip() or str(card.card_sn)

        # upload/{series}/{number}/gen 디렉토리 하위에 저장
        subdirectory = f"{safe_series}/{safe_number}/gen"

        file_url, _ = await save_uploaded_file(
            file,
            subdirectory=subdirectory,
            filename_prefix="gen_",
        )

        # 합성카드 테이블에 연계 저장
        record = CardGeneratedImage(card_sn=card_sn, image_url=file_url)
        db.add(record)
        db.commit()
        db.refresh(record)

        return CardGeneratedImageUploadResponseSchema(
            success=True,
            message="합성이미지가 등록되었습니다.",
            imageUrl=file_url
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"합성이미지 등록 중 오류가 발생했습니다: {str(e)}"
        )


@router.delete("/{card_sn}/generated-image", response_model=CardGeneratedImageDeleteResponseSchema)
async def delete_latest_card_generated_image(
    card_sn: int,
    db: Session = Depends(get_db),
):
    """
    해당 카드의 가장 최근 합성이미지를 1장 삭제합니다.
    - 카드별 최신 생성순(CardGeneratedImage.created_at DESC)으로 1장을 찾아
      물리 파일과 DB 레코드를 함께 삭제합니다.
    """
    try:
        # 카드 존재 여부 확인
        card = db.query(Card).filter(Card.card_sn == card_sn).first()
        if not card:
            raise HTTPException(
                status_code=404,
                detail=f"카드 일련번호 {card_sn}에 해당하는 카드를 찾을 수 없습니다.",
            )

        # 최신 합성이미지 1장 조회
        latest_gen = (
            db.query(CardGeneratedImage)
            .filter(CardGeneratedImage.card_sn == card_sn)
            .order_by(desc(CardGeneratedImage.created_at))
            .first()
        )

        if not latest_gen:
            raise HTTPException(
                status_code=404,
                detail="삭제할 합성이미지가 없습니다.",
            )

        # 물리 파일 삭제 시도 (실패하더라도 계속 진행)
        try:
            file_path = get_file_path_from_url(latest_gen.image_url)
            if file_path:
                delete_file(file_path)
        except Exception:
            # 로그만 출력하고 계속 진행
            import traceback
            print("합성이미지 파일 삭제 중 오류:", traceback.format_exc())

        # DB 레코드 삭제
        db.delete(latest_gen)
        db.commit()

        return CardGeneratedImageDeleteResponseSchema(
            success=True,
            message="가장 최근 합성이미지가 삭제되었습니다.",
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"합성이미지 삭제 중 오류가 발생했습니다: {str(e)}",
        )


@router.get("/{card_sn}/generated-images", response_model=CardGeneratedImageListResponseSchema)
async def list_card_generated_images(
    card_sn: int,
    db: Session = Depends(get_db),
):
    """
    해당 카드에 등록된 모든 합성이미지 URL 목록을 반환합니다.
    등록 순서(created_at ASC)대로 정렬하여 반환합니다.
    """
    try:
        # 카드 존재 여부 확인
        card = db.query(Card).filter(Card.card_sn == card_sn).first()
        if not card:
            raise HTTPException(
                status_code=404,
                detail=f"카드 일련번호 {card_sn}에 해당하는 카드를 찾을 수 없습니다.",
            )

        rows = (
            db.query(CardGeneratedImage)
            .filter(CardGeneratedImage.card_sn == card_sn)
            .order_by(CardGeneratedImage.created_at.asc())
            .all()
        )

        urls = [row.image_url for row in rows]

        return CardGeneratedImageListResponseSchema(
            success=True,
            images=urls,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"합성이미지 목록 조회 중 오류가 발생했습니다: {str(e)}",
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
