"""
영웅 풀오토(10각형 서번트 자동 배분) 스키마
"""
from typing import List, Optional

from pydantic import BaseModel, Field


class ServantSlotSchema(BaseModel):
    """서번트 슬롯 정보 (10각형의 한 칸)."""

    position: int = Field(..., description="슬롯 위치 인덱스 (0~9)")
    gender: str = Field(..., description="성별 (예: 남, 여)")
    attribute: Optional[str] = Field(None, description="속성 이름")
    type: Optional[str] = Field(None, description="클래스 이름")


class HeroAutoPoolBaseSchema(BaseModel):
    """공통 필드"""

    characterId: int = Field(..., description="플로우 캐릭터 ID")


class HeroAutoPoolCreateSchema(HeroAutoPoolBaseSchema):
    """영웅 풀오토 생성 요청 스키마"""

    # 최초 생성 시에는 servants 비워둔 상태로 생성
    pass


class HeroAutoPoolListItemSchema(BaseModel):
    """풀 목록 한 건 (사이드바 등용)."""

    id: int = Field(..., description="풀 ID")
    characterId: int = Field(..., description="캐릭터 ID")
    characterName: Optional[str] = Field(None, description="캐릭터명")
    isConfirmed: bool = Field(..., description="확정 여부")


class HeroAutoPoolResponseSchema(HeroAutoPoolBaseSchema):
    """영웅 풀오토 응답 스키마"""

    id: int = Field(..., description="풀오토 ID")
    servants: List[ServantSlotSchema] = Field(
        default_factory=list, description="10개 서번트 슬롯 정보"
    )
    isConfirmed: bool = Field(..., description="확정 여부")
    classOrder: Optional[List[str]] = Field(
        default_factory=list,
        description="클래스 카테고리 순서(정렬용, 풀 조회 시에만 채워짐)",
    )

    class Config:
        from_attributes = True


class HeroAutoPoolUpdateSchema(BaseModel):
    """풀오토 업데이트(서번트 수동 수정용, 현재는 사용하지 않지만 확장 대비)"""

    servants: List[ServantSlotSchema] = Field(
        ..., description="업데이트할 서번트 슬롯 정보"
    )


class HeroAutoDistributeRequestSchema(BaseModel):
    """속성/클래스 자동 배분 요청 스키마"""

    # 속성 배분 시작 성별 (남성/여성). 현재 기획상 남성→여성→남성→여성 고정이지만 확장 대비.
    attributeStartGender: str = Field(
        "남성", description="속성 배분 시작 성별 (예: 남성 또는 여성)"
    )
    # 클래스 배분 시작 성별 (여성/남성). 현재 기획상 여성→남성→여성→남성 고정.
    classStartGender: str = Field(
        "여성", description="클래스 배분 시작 성별 (예: 남성 또는 여성)"
    )


class HeroAutoDistributeResponseSchema(BaseModel):
    """속성/클래스 자동 배분 응답 스키마"""

    success: bool = Field(..., description="성공 여부")
    pool: HeroAutoPoolResponseSchema = Field(..., description="업데이트된 풀오토 정보")


class HeroAutoConfirmResponseSchema(BaseModel):
    """확정/재생성 등 상태 변경 응답"""

    success: bool = Field(..., description="성공 여부")
    pool: HeroAutoPoolResponseSchema = Field(..., description="변경된 풀오토 정보")



