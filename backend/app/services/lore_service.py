"""
플로우용 Lore(세계관) 분석 서비스.
이름·설명 → OpenAI 구조화 반환 (Fate/strange Fake 스타일).
"""
from openai import OpenAI
from pydantic import ValidationError

from app.core.config import settings
from app.schemas.lore import LoreMappingResult


def run_lore_mapping(name: str, description: str = "") -> LoreMappingResult:
    """
    인물 이름·설명으로 세계관 설정 분석 후 구조화 반환.
    description: 인물/세계관에 대한 설명 (선택). 없으면 이름만으로 추론.
    """
    api_key = getattr(settings, "OPENAI_API_KEY", None) or ""
    if not api_key:
        raise ValueError("OPENAI_API_KEY가 설정되지 않았습니다. .env에 OPENAI_API_KEY를 넣어주세요.")

    client = OpenAI(api_key=api_key)

    system_prompt = """
You are a Fate/strange Fake and Fate/stay night lore analysis engine.
Analyze the given character according to Nasuverse rules.
Return ONLY valid JSON matching the provided schema. Do NOT include extra commentary.

**Language: Return all text fields in "한국어(English)" format.** Example: 역사(Historical), 신화(Mythical), 낮음(Low).
- historical_or_mythical: use exactly one of 역사(Historical), 신화(Mythical), 전설(Legendary), 개념(Conceptual).
- main_archetype: use exactly one of 신성왕(Divine King), 폭군(Tyrant King), 정복자(Conqueror), 성인(Saint), 해군사령관(Naval Commander), 사기꾼(Trickster), 마술왕(Magus King), 영령(Heroic Spirit).
- legend_rank: use exactly one of 낮음(Low), 중간(Medium), 높음(High), 극한(Extreme).
- mystery_level: use exactly one of 현대(Modern), 중세(Medieval), 고대(Ancient), 신대(Age of Gods).
- divinity_potential: use exactly one of 없음(None), 낮음(Low), 중간(Medium), 높음(High).
- era, origin_country: Korean with optional (English) in parentheses.
- iconic_weapons_or_symbols (전투/상징): list of Korean strings, optionally "한국어(English)" per item.
- noble_phantasms (보구정보): list of dictionaries, each with "보구명" and "진명개방" keys. 
  보구(宝具, Noble Phantasm)는 서번트의 아이덴티티로, 생전에 사용하던 무구나 기술, 유명한 일화를 구현한 것입니다.
  진명개방(真名解放)은 보구의 진정한 힘을 끌어내기 위해 진정한 보구의 이름을 외쳐 파장을 일치시키는 것입니다.
  예시: [{"보구명": "약속된 승리의 검(Excalibur)", "진명개방": "엑스칼리버"}, {"보구명": "왕의 재보(Gate of Babylon)", "진명개방": "게이트 오브 바빌론"}]
- key_achievements: list of Korean strings, optionally "한국어(English)" per item.
"""

    desc_block = f"\nDescription: {description}" if (description and description.strip()) else ""
    user_prompt = f"""
Name: {name}
{desc_block}

Analyze this character for Fate/strange Fake universe adaptation.
Return all display values in "한국어(English)" format as specified.
"""

    response = client.responses.parse(
        model="gpt-4o-mini",
        input=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        text_format=LoreMappingResult,
    )

    try:
        result: LoreMappingResult = response.output_parsed
        return result
    except ValidationError as e:
        raise ValueError(f"Schema validation failed: {e}") from e
