"""
카드 관련 스키마 정의
"""
from pydantic import BaseModel, Field
from typing import Optional


class SkillSchema(BaseModel):
    """스킬 스키마"""
    name: str = Field(..., description="스킬명")
    description: str = Field(..., description="스킬 효과 설명")


class CardDataSchema(BaseModel):
    """카드 데이터 스키마"""
    cardName: str = Field(..., description="카드명", min_length=1)
    type: str = Field(..., description="카드 타입", min_length=1)
    attribute: str = Field(..., description="카드 속성", min_length=1)
    rarity: str = Field(..., description="카드 등급", min_length=1)
    attack: Optional[str] = Field(default="0", description="공격력")
    health: Optional[str] = Field(default="0", description="체력")
    skill1Name: Optional[str] = Field(default="", description="스킬 1 이름")
    skill1Description: Optional[str] = Field(default="", description="스킬 1 설명")
    skill2Name: Optional[str] = Field(default="", description="스킬 2 이름")
    skill2Description: Optional[str] = Field(default="", description="스킬 2 설명")
    flavorText: Optional[str] = Field(default="", description="플레이버 텍스트")
    cardNumber: Optional[str] = Field(default="", description="카드번호 (사용자 입력)")
    series: Optional[str] = Field(default="", description="시리즈/제작자 정보")


class CardGenerationRequestSchema(BaseModel):
    """카드 생성 요청 스키마"""
    cardData: CardDataSchema = Field(..., description="카드 데이터")
    characterImageUrl: Optional[str] = Field(None, description="캐릭터 이미지 URL")
    backgroundImageUrl: Optional[str] = Field(None, description="배경 이미지 URL")


class CardGenerationResponseSchema(BaseModel):
    """카드 생성 응답 스키마"""
    success: bool = Field(..., description="성공 여부")
    message: str = Field(..., description="응답 메시지")
    prompt: Optional[str] = Field(None, description="생성된 프롬프트")
    imageUrl: Optional[str] = Field(None, description="생성된 이미지 URL")


class HealthCheckSchema(BaseModel):
    """헬스 체크 응답 스키마"""
    status: str = Field(default="healthy", description="서버 상태")


class CardSaveRequestSchema(BaseModel):
    """카드 저장 요청 스키마"""
    cardData: CardDataSchema = Field(..., description="카드 데이터")
    characterImageUrl: Optional[str] = Field(None, description="캐릭터 이미지 URL")
    backgroundImageUrl: Optional[str] = Field(None, description="배경 이미지 URL")
    generatedPrompt: Optional[str] = Field(None, description="생성된 프롬프트")
    generatedImageUrl: Optional[str] = Field(None, description="생성된 이미지 URL")


class CardSaveResponseSchema(BaseModel):
    """카드 저장 응답 스키마"""
    success: bool = Field(..., description="성공 여부")
    message: str = Field(..., description="응답 메시지")
    cardSn: Optional[int] = Field(None, description="저장된 카드 일련번호")


class CardResponseSchema(BaseModel):
    """카드 응답 스키마"""
    cardSn: int = Field(..., description="카드 일련번호 (자동생성)")
    cardNumber: Optional[str] = Field(None, description="카드번호 (사용자 입력)")
    cardName: str = Field(..., description="카드명")
    type: str = Field(..., description="카드 타입")
    attribute: str = Field(..., description="카드 속성")
    rarity: str = Field(..., description="카드 등급")
    attack: str = Field(..., description="공격력")
    health: str = Field(..., description="체력")
    skill1Name: Optional[str] = Field(None, description="스킬 1 이름")
    skill1Description: Optional[str] = Field(None, description="스킬 1 설명")
    skill2Name: Optional[str] = Field(None, description="스킬 2 이름")
    skill2Description: Optional[str] = Field(None, description="스킬 2 설명")
    flavorText: Optional[str] = Field(None, description="플레이버 텍스트")
    series: Optional[str] = Field(None, description="시리즈/제작자 정보")
    characterImageUrl: Optional[str] = Field(None, description="캐릭터 이미지 URL")
    backgroundImageUrl: Optional[str] = Field(None, description="배경 이미지 URL")
    generatedPrompt: Optional[str] = Field(None, description="생성된 프롬프트")
    generatedImageUrl: Optional[str] = Field(None, description="생성된 이미지 URL")
    draftImageUrl: Optional[str] = Field(None, description="초안(최초 생성) 이미지 URL")
    createdAt: str = Field(..., description="생성일시")
    updatedAt: str = Field(..., description="수정일시")


class CardListResponseSchema(BaseModel):
    """카드 목록 응답 스키마"""
    success: bool = Field(..., description="성공 여부")
    total: int = Field(..., description="전체 카드 개수")
    cards: list[CardResponseSchema] = Field(..., description="카드 목록")


class CardDeleteResponseSchema(BaseModel):
    """카드 삭제 응답 스키마"""
    success: bool = Field(..., description="성공 여부")
    message: str = Field(..., description="응답 메시지")


class CardGeneratedImageUploadResponseSchema(BaseModel):
    """카드 합성이미지 업로드 응답 스키마"""
    success: bool = Field(..., description="성공 여부")
    message: str = Field(..., description="응답 메시지")
    imageUrl: Optional[str] = Field(None, description="저장된 이미지 URL")


class CardGeneratedImageDeleteResponseSchema(BaseModel):
    """카드 합성이미지 삭제 응답 스키마"""
    success: bool = Field(..., description="성공 여부")
    message: str = Field(..., description="응답 메시지")


class CardGeneratedImageListResponseSchema(BaseModel):
    """카드 합성이미지 목록 응답 스키마"""
    success: bool = Field(..., description="성공 여부")
    images: list[str] = Field(default_factory=list, description="합성이미지 URL 목록 (등록 순서)")


class RootResponseSchema(BaseModel):
    """루트 엔드포인트 응답 스키마"""
    message: str = Field(..., description="서버 메시지")
    version: str = Field(..., description="서버 버전")
    status: str = Field(default="running", description="서버 상태")
