"""
카드 SNS 게시물 API (관리자용)
cards·flow_cards 기반 카드 선택 후 해당 카드에 대한 SNS 게시문 작성·관리.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.database.models import Card, CardSnsPost
from app.schemas.card_sns_post import (
    CardSnsPostCreateSchema,
    CardSnsPostUpdateSchema,
    CardSnsPostResponseSchema,
    CardSnsPostListResponseSchema,
)
from app.api.routes.auth import get_current_user_required
from app.services.instagram_caption_service import (
    generate_instagram_caption,
    generate_instagram_caption_single,
)
from app.services.api_usage_log_service import log_api_usage, OPERATION_POST_CREATION

router = APIRouter(prefix="/card-sns-posts", tags=["card-sns-posts"])


class GenerateInstagramCaptionRequest(BaseModel):
    card_sn: int


class GenerateInstagramCaptionResponse(BaseModel):
    firstLine: str
    body: str
    hashtags: str


class GenerateInstagramCaptionSingleRequest(BaseModel):
    card_sn: int
    field: str  # "firstLine" | "body" | "hashtags"


class GenerateInstagramCaptionSingleResponse(BaseModel):
    value: str


def _post_to_response(p: CardSnsPost) -> CardSnsPostResponseSchema:
    return CardSnsPostResponseSchema(
        id=p.id,
        cardSn=p.card_sn,
        flowCardId=p.flow_card_id,
        content=p.content,
        platform=p.platform,
        status=p.status or "draft",
        url=p.url,
        createdAt=p.created_at.isoformat() if p.created_at else "",
        updatedAt=p.updated_at.isoformat() if p.updated_at else "",
    )


@router.get("", response_model=CardSnsPostListResponseSchema)
async def list_posts(
    card_sn: int | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_required),
):
    """카드별 SNS 게시물 목록 (card_sn 필터 선택)"""
    q = db.query(CardSnsPost)
    if card_sn is not None:
        q = q.filter(CardSnsPost.card_sn == card_sn)
    q = q.order_by(CardSnsPost.updated_at.desc())
    posts = q.all()
    return CardSnsPostListResponseSchema(
        success=True,
        total=len(posts),
        posts=[_post_to_response(p) for p in posts],
    )


@router.post("/generate-instagram-caption", response_model=GenerateInstagramCaptionResponse)
async def generate_instagram_caption_for_card(
    body: GenerateInstagramCaptionRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_required),
):
    """선택한 카드 정보로 인스타그램용 한 줄 소개·본문·해시태그를 AI로 생성합니다."""
    card = db.query(Card).filter(Card.card_sn == body.card_sn).first()
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"카드 일련번호 {body.card_sn}을(를) 찾을 수 없습니다.",
        )
    try:
        result, usage = await generate_instagram_caption(
            card_name=card.card_name or "",
            card_type=card.type or "",
            attribute=card.attribute or "",
            rarity=card.rarity or "",
            gender=card.gender,
            flavor_text=card.flavor_text,
            series=card.series,
        )
        if usage:
            log_api_usage(
                db,
                OPERATION_POST_CREATION,
                model="gpt-5-mini",
                input_tokens=usage.get("input_tokens"),
                output_tokens=usage.get("output_tokens"),
                user_id=current_user.id,
                extra={"endpoint": "instagram-caption", "card_sn": body.card_sn},
            )
            db.commit()
        return GenerateInstagramCaptionResponse(
            firstLine=result["firstLine"],
            body=result["body"],
            hashtags=result["hashtags"],
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"캡션 생성 중 오류가 발생했습니다: {str(e)}",
        )


@router.post("/generate-instagram-caption-single", response_model=GenerateInstagramCaptionSingleResponse)
async def generate_instagram_caption_single_for_card(
    body: GenerateInstagramCaptionSingleRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_required),
):
    """선택한 카드로 인스타그램용 한 줄 소개 / 본문 / 해시태그 중 하나만 AI로 생성합니다."""
    if body.field not in ("firstLine", "body", "hashtags"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="field는 firstLine, body, hashtags 중 하나여야 합니다.",
        )
    card = db.query(Card).filter(Card.card_sn == body.card_sn).first()
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"카드 일련번호 {body.card_sn}을(를) 찾을 수 없습니다.",
        )
    try:
        value, usage = await generate_instagram_caption_single(
            card_name=card.card_name or "",
            card_type=card.type or "",
            attribute=card.attribute or "",
            rarity=card.rarity or "",
            field=body.field,
            gender=card.gender,
            flavor_text=card.flavor_text,
            series=card.series,
        )
        if usage:
            log_api_usage(
                db,
                OPERATION_POST_CREATION,
                model="gpt-5-mini",
                input_tokens=usage.get("input_tokens"),
                output_tokens=usage.get("output_tokens"),
                user_id=current_user.id,
                extra={"endpoint": "instagram-caption-single", "card_sn": body.card_sn, "field": body.field},
            )
            db.commit()
        return GenerateInstagramCaptionSingleResponse(value=value)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"캡션 생성 중 오류가 발생했습니다: {str(e)}",
        )


@router.post("", response_model=CardSnsPostResponseSchema, status_code=status.HTTP_201_CREATED)
async def create_post(
    body: CardSnsPostCreateSchema,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_required),
):
    """SNS 게시물 생성"""
    card = db.query(Card).filter(Card.card_sn == body.card_sn).first()
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"카드 일련번호 {body.card_sn}을(를) 찾을 수 없습니다.",
        )
    post = CardSnsPost(
        card_sn=body.card_sn,
        flow_card_id=body.flow_card_id,
        content=body.content.strip(),
        platform=(body.platform or "").strip() or None,
        status=(body.status or "draft").strip(),
        url=(body.url or "").strip() or None,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return _post_to_response(post)


@router.get("/{post_id}", response_model=CardSnsPostResponseSchema)
async def get_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_required),
):
    """SNS 게시물 단건 조회"""
    post = db.query(CardSnsPost).filter(CardSnsPost.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 게시물을 찾을 수 없습니다.",
        )
    return _post_to_response(post)


@router.patch("/{post_id}", response_model=CardSnsPostResponseSchema)
async def update_post(
    post_id: int,
    body: CardSnsPostUpdateSchema,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_required),
):
    """SNS 게시물 수정"""
    post = db.query(CardSnsPost).filter(CardSnsPost.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 게시물을 찾을 수 없습니다.",
        )
    if body.content is not None:
        post.content = body.content.strip()
    if body.platform is not None:
        post.platform = body.platform.strip() or None
    if body.status is not None:
        post.status = body.status.strip()
    if body.url is not None:
        post.url = body.url.strip() or None
    db.commit()
    db.refresh(post)
    return _post_to_response(post)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_required),
):
    """SNS 게시물 삭제"""
    post = db.query(CardSnsPost).filter(CardSnsPost.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 게시물을 찾을 수 없습니다.",
        )
    db.delete(post)
    db.commit()
    return None
