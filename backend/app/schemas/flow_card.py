"""
FlowCard 스키마
"""
from pydantic import BaseModel, Field
from typing import Optional


class FlowCardCreateSchema(BaseModel):
    """FlowCard 생성 스키마"""
    characterId: int = Field(..., description="캐릭터 ID")
    gender: str = Field(..., description="성별")
    attribute: str = Field(..., description="속성")
    type: str = Field(..., description="클래스")


class FlowCardResponseSchema(BaseModel):
    """FlowCard 응답 스키마"""
    id: int = Field(..., description="카드 ID")
    characterId: int = Field(..., description="캐릭터 ID")
    gender: str = Field(..., description="성별")
    attribute: str = Field(..., description="속성")
    type: str = Field(..., description="클래스 (2뎁스만)")
    prompt: Optional[str] = Field(None, description="프롬프트")
    negativePrompt: Optional[str] = Field(None, description="네거티브 프롬프트")
    imageUrl: Optional[str] = Field(None, description="카드 이미지 URL (16:9 비율)")
    promptGenerationStatus: Optional[str] = Field(None, description="프롬프트 생성 상태 (null: 미요청, 'requested': 요청중, 'completed': 완료)")
    createdAt: str = Field(..., description="생성일시")
    updatedAt: str = Field(..., description="수정일시")

    class Config:
        from_attributes = True


class FlowCardListResponseSchema(BaseModel):
    """FlowCard 목록 응답 스키마"""
    success: bool = Field(..., description="성공 여부")
    total: int = Field(..., description="전체 개수")
    cards: list[FlowCardResponseSchema] = Field(..., description="카드 목록")


class FlowCardGenerateRequestSchema(BaseModel):
    """FlowCard 생성 요청 스키마 (캐릭터 클릭 시 조합 생성)"""
    characterId: int = Field(..., description="캐릭터 ID")
    genders: list[str] = Field(..., description="성별 목록")
    attributes: list[str] = Field(..., description="속성 목록")
    types: list[str] = Field(..., description="클래스 목록")


class FlowCardGenerateResponseSchema(BaseModel):
    """FlowCard 생성 응답 스키마"""
    success: bool = Field(..., description="성공 여부")
    message: str = Field(..., description="메시지")
    created: int = Field(..., description="생성된 카드 수")
    skipped: int = Field(..., description="건너뛴 카드 수 (이미 존재)")


class FlowCardUpdateRequestSchema(BaseModel):
    """FlowCard 업데이트 요청 스키마"""
    prompt: str | None = Field(None, description="프롬프트")
    negativePrompt: str | None = Field(None, description="네거티브 프롬프트")
    imageUrl: str | None = Field(None, description="카드 이미지 URL")
    promptGenerationStatus: str | None = Field(None, description="프롬프트 생성 상태 (null: 미요청, 'requested': 요청중, 'completed': 완료)")


class FlowCardUpdateResponseSchema(BaseModel):
    """FlowCard 업데이트 응답 스키마"""
    success: bool = Field(..., description="성공 여부")
    message: str = Field(..., description="메시지")
