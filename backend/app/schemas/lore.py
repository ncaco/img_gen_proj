"""
플로우용 Lore(세계관) 분석 스키마.
인물 이름·설명 → GPT 구조화 반환 (Fate/strange Fake 스타일).
응답은 한국어 또는 "한국어(English)" 형식으로 반환.
"""
from pydantic import BaseModel, Field
from typing import Optional


class LoreMappingResult(BaseModel):
    """인물 세계관 분석 결과 (GPT 구조화 반환). 값은 한국어 또는 한국어(영어) 형식."""

    name: str

    historical_or_mythical: str = Field(..., description="역사/신화 구분, 예: 역사(Historical)")
    origin_country: Optional[str] = Field(None, description="출신, 한국어 또는 한국어(영어)")
    era: str = Field(..., description="시대, 한국어 또는 한국어(영어)")

    main_archetype: str = Field(..., description="아키타입, 예: 신성왕(Divine King)")

    legend_rank: str = Field(..., description="전설성, 예: 낮음(Low)")
    mystery_level: str = Field(..., description="신비도, 예: 현대(Modern)")
    divinity_potential: str = Field(..., description="신성, 예: 없음(None)")

    noble_phantasms: Optional[list[dict[str, str]]] = Field(
        default=None,
        description="보구정보. 각 항목은 {'보구명': '', '진명개방': ''} 형태"
    )
    key_achievements: list[str] = Field(default_factory=list, description="업적, 한국어")


class LoreMappingRequest(BaseModel):
    """Lore 분석 요청 (이름 + 설명). 키(character_id) 있으면 해당 레코드 업데이트."""

    name: str = Field(..., min_length=1, description="인물 이름")
    description: Optional[str] = Field(default="", description="인물/세계관 설명 (선택)")
    character_id: Optional[int] = Field(None, description="캐릭터 키. 있으면 해당 레코드에 결과 업데이트")
    flow_id: Optional[int] = Field(None, description="플로우 ID (신규 생성 시 연결)")


def lore_mapping_to_response(obj: LoreMappingResult) -> dict:
    """LoreMappingResult → camelCase dict (API 응답용)."""
    return {
        "name": obj.name,
        "historicalOrMythical": obj.historical_or_mythical,
        "originCountry": obj.origin_country,
        "era": obj.era,
        "mainArchetype": obj.main_archetype,
        "legendRank": obj.legend_rank,
        "mysteryLevel": obj.mystery_level,
        "divinityPotential": obj.divinity_potential,
        "noblePhantasms": obj.noble_phantasms or [],
        "keyAchievements": obj.key_achievements,
    }


# ----- FlowCharacter -----
class FlowCharacterResponseSchema(BaseModel):
    """FlowCharacter 응답 (id, name만 포함)"""
    id: int = Field(..., description="캐릭터 ID")
    name: str = Field(..., description="캐릭터 이름")


class FlowCharacterListResponseSchema(BaseModel):
    """FlowCharacter 목록 응답"""
    success: bool = Field(..., description="성공 여부")
    total: int = Field(..., description="전체 개수")
    characters: list[FlowCharacterResponseSchema] = Field(..., description="캐릭터 목록")


class FlowCharacterDetailResponseSchema(BaseModel):
    """FlowCharacter 상세 응답"""
    id: int = Field(..., description="캐릭터 ID")
    name: str = Field(..., description="캐릭터 이름")
    description: Optional[str] = Field(None, description="캐릭터/세계관 설명")
    historicalOrMythical: Optional[str] = Field(None, description="역사/신화 구분")
    originCountry: Optional[str] = Field(None, description="출신")
    era: Optional[str] = Field(None, description="시대")
    mainArchetype: Optional[str] = Field(None, description="아키타입")
    legendRank: Optional[str] = Field(None, description="전설성")
    mysteryLevel: Optional[str] = Field(None, description="신비도")
    divinityPotential: Optional[str] = Field(None, description="신성")
    noblePhantasms: list[dict[str, str]] = Field(default_factory=list, description="보구정보")
    keyAchievements: list[str] = Field(default_factory=list, description="업적")
