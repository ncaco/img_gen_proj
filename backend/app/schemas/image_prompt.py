"""
이미지 프롬프트 생성 관련 스키마
"""
from pydantic import BaseModel, Field
from typing import Literal, Optional


class OptimalServantSetup(BaseModel):
    """최적의 서번트 설정"""
    # 핵심 Fate 스펙
    class_name: Literal[
        "Saber",    # 세이버
        "Archer",  # 아처
        "Lancer",  # 랜서
        "Rider",   # 라이더
        "Caster",  # 캐스터
        "Assassin", # 어새신   
        "Berserker", # 버서커
        "Ruler",    # 룰러
        "Avenger",  # 어벤저
        "Alter Ego", # 얼터 에고
        "Pretender", # 프리텐더
        "Foreigner" # 포리너
    ]
    spirit_origin_type: str
    attribute: Literal[
        "Heaven",   # 천
        "Earth",    # 지
        "Human",    # 인
        "Star",     # 별
        "Beast"     # 짐승
    ]
    alignment: str
    divinity_rank: str
    era: str

    # 상징
    main_noble_phantasm_type: str

    # 보구정보
    noble_phantasms: Optional[list[dict[str, str]]] = Field(
        default=None,
        description="보구정보. 각 항목은 {'보구명': '', '진명개방': ''} 형태"
    )

    # 위협 수준
    world_threat_level: Literal[
        "Local",        # 지역
        "National",    # 국가
        "Continental",  # 대륙
        "Mythic",      # 신화
        "World-Class" # 세계적
    ]

    # 설정 요약
    core_concept: str
    representative_noble_phantasm: str


class ImagePromptResult(BaseModel):
    """이미지 프롬프트 생성 결과"""
    # 최종 이미지 생성용 (영문)
    landscape_image_prompt_en: str = Field(..., description="랜드스케이프 이미지 프롬프트 (영문)")

    # 네거티브/제거 옵션
    negative_prompt_en: str = Field(..., description="네거티브 프롬프트 (영문)")


class ImagePromptRequest(BaseModel):
    """이미지 프롬프트 생성 요청"""
    characterId: int = Field(..., description="캐릭터 ID")
    gender: str = Field(..., description="성별")
    attribute: str = Field(..., description="속성")
    type: str = Field(..., description="클래스")


class ImagePromptResponse(BaseModel):
    """이미지 프롬프트 생성 응답"""
    success: bool = Field(..., description="성공 여부")
    prompt: str = Field(..., description="프롬프트")
    negativePrompt: str = Field(..., description="네거티브 프롬프트")
    characterSettings: dict = Field(
        default_factory=dict,
        description="캐릭터 설정 정보 (프롬프트 변수에 포함)"
    )
