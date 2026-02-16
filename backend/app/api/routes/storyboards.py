"""
스토리보드 API: 카드별 스토리보드 조회·저장·씬 삭제
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.database.models import Card, Storyboard, StoryboardScene
from app.schemas.storyboard import (
    StoryboardResponseSchema,
    StoryboardSceneResponseSchema,
    StoryboardSaveRequestSchema,
)
from app.api.routes.auth import get_current_user_required

router = APIRouter(prefix="/storyboards", tags=["storyboards"])


def _scene_to_response(s: StoryboardScene) -> StoryboardSceneResponseSchema:
    return StoryboardSceneResponseSchema(
        id=s.id,
        sortOrder=s.sort_order,
        content=s.content or "",
        durationSeconds=s.duration_seconds or 0,
    )


@router.get("/by-card/{card_sn}", response_model=StoryboardResponseSchema)
async def get_storyboard_by_card(
    card_sn: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_required),
):
    """카드별 스토리보드 조회. 없으면 생성 후 반환."""
    card = db.query(Card).filter(Card.card_sn == card_sn).first()
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"카드 일련번호 {card_sn}을(를) 찾을 수 없습니다.",
        )
    storyboard = db.query(Storyboard).filter(Storyboard.card_sn == card_sn).first()
    if not storyboard:
        storyboard = Storyboard(card_sn=card_sn)
        db.add(storyboard)
        db.commit()
        db.refresh(storyboard)
    scenes = (
        db.query(StoryboardScene)
        .filter(StoryboardScene.storyboard_id == storyboard.id)
        .order_by(StoryboardScene.sort_order.asc(), StoryboardScene.id.asc())
        .all()
    )
    return StoryboardResponseSchema(
        id=storyboard.id,
        cardSn=storyboard.card_sn,
        scenes=[_scene_to_response(s) for s in scenes],
    )


@router.put("/{storyboard_id}", response_model=StoryboardResponseSchema)
async def save_storyboard(
    storyboard_id: int,
    body: StoryboardSaveRequestSchema,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_required),
):
    """스토리보드 씬 목록 저장 (전체 교체)."""
    storyboard = db.query(Storyboard).filter(Storyboard.id == storyboard_id).first()
    if not storyboard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="스토리보드를 찾을 수 없습니다.",
        )
    # 기존 씬 삭제
    db.query(StoryboardScene).filter(StoryboardScene.storyboard_id == storyboard_id).delete()
    # 새 씬 추가 (sort_order 1부터)
    for i, item in enumerate(body.scenes, start=1):
        scene = StoryboardScene(
            storyboard_id=storyboard_id,
            sort_order=i,
            content=item.content,
            duration_seconds=item.durationSeconds,
        )
        db.add(scene)
    db.commit()
    db.refresh(storyboard)
    scenes = (
        db.query(StoryboardScene)
        .filter(StoryboardScene.storyboard_id == storyboard.id)
        .order_by(StoryboardScene.sort_order.asc(), StoryboardScene.id.asc())
        .all()
    )
    return StoryboardResponseSchema(
        id=storyboard.id,
        cardSn=storyboard.card_sn,
        scenes=[_scene_to_response(s) for s in scenes],
    )


@router.delete("/scenes/{scene_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_storyboard_scene(
    scene_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_required),
):
    """스토리보드 씬 삭제."""
    scene = db.query(StoryboardScene).filter(StoryboardScene.id == scene_id).first()
    if not scene:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="씬을 찾을 수 없습니다.",
        )
    db.delete(scene)
    db.commit()
