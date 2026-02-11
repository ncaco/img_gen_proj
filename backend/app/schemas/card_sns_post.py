"""
카드 SNS 게시물 스키마
"""
from pydantic import BaseModel, Field
from typing import Optional


class CardSnsPostCreateSchema(BaseModel):
    """SNS 게시물 생성 요청"""
    card_sn: int = Field(..., description="카드 일련번호 (FK)")
    flow_card_id: Optional[int] = Field(None, description="플로우 카드 ID (선택)")
    content: str = Field(..., min_length=1, description="게시물 본문")
    platform: Optional[str] = Field(None, description="플랫폼 (twitter, instagram 등)")
    status: str = Field(default="draft", description="상태: draft, published")
    url: Optional[str] = Field(None, description="게시된 SNS URL (선택)")


class CardSnsPostUpdateSchema(BaseModel):
    """SNS 게시물 수정 요청"""
    content: Optional[str] = Field(None, min_length=1, description="게시물 본문")
    platform: Optional[str] = Field(None, description="플랫폼")
    status: Optional[str] = Field(None, description="상태: draft, published")
    url: Optional[str] = Field(None, description="게시된 SNS URL (선택)")


class CardSnsPostResponseSchema(BaseModel):
    """SNS 게시물 응답"""
    id: int
    cardSn: int = Field(..., description="카드 일련번호")
    flowCardId: Optional[int] = Field(None, description="플로우 카드 ID")
    content: str
    platform: Optional[str] = None
    status: str
    url: Optional[str] = None
    createdAt: str = Field(..., description="생성일시")
    updatedAt: str = Field(..., description="수정일시")


class CardSnsPostListResponseSchema(BaseModel):
    """SNS 게시물 목록 응답"""
    success: bool = True
    total: int
    posts: list[CardSnsPostResponseSchema]
