"""
플로우 관련 스키마: 보구 생성, 플레이버 텍스트 생성 등
"""
from pydantic import BaseModel, Field
from typing import Optional


class NoblePhantasmGenerateRequest(BaseModel):
    """보구 생성 요청 스키마"""
    characterId: int = Field(..., description="캐릭터 ID")
    gender: str = Field(..., description="성별")
    attribute: str = Field(..., description="속성")
    type: str = Field(..., description="클래스")
    excludeNoblePhantasms: Optional[list[dict[str, str]]] = Field(
        default=None,
        description="제외할 보구 목록 (각 항목은 {'보구명': '', '진명개방': ''} 형태)"
    )


class NoblePhantasmGenerateResponse(BaseModel):
    """보구 생성 응답 스키마"""
    success: bool = Field(..., description="성공 여부")
    보구명: str = Field(..., description="보구명")
    진명개방: str = Field(..., description="진명개방")


class FlavorTextGenerateRequest(BaseModel):
    """플레이버 텍스트 생성 요청 스키마"""
    characterId: int = Field(..., description="캐릭터 ID")
    gender: str = Field(..., description="성별")
    attribute: str = Field(..., description="속성")
    type: str = Field(..., description="클래스")


class FlavorTextGenerateResponse(BaseModel):
    """플레이버 텍스트 생성 응답 스키마"""
    success: bool = Field(..., description="성공 여부")
    flavorText: str = Field(..., description="플레이버 텍스트")


class CardDataGenerateRequest(BaseModel):
    """카드 데이터 일괄 생성 요청 스키마"""
    characterId: int = Field(..., description="캐릭터 ID")
    gender: str = Field(..., description="성별")
    attribute: str = Field(..., description="속성")
    type: str = Field(..., description="클래스")
    excludeNoblePhantasms: Optional[list[dict[str, str]]] = Field(
        default=None,
        description="제외할 보구 목록 (각 항목은 {'보구명': '', '진명개방': ''} 형태)"
    )


class CardDataGenerateResponse(BaseModel):
    """카드 데이터 일괄 생성 응답 스키마"""
    success: bool = Field(..., description="성공 여부")
    noblePhantasm1: dict[str, str] = Field(..., description="보구1 (보구명, 진명개방)")
    noblePhantasm2: dict[str, str] = Field(..., description="보구2 (보구명, 진명개방)")
    flavorText: str = Field(..., description="플레이버 텍스트")
