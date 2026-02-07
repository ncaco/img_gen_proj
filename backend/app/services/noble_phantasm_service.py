"""
보구 및 플레이버 텍스트 생성 서비스
"""
from openai import AsyncOpenAI
from pydantic import ValidationError, BaseModel

from app.core.config import settings
from app.schemas.lore import LoreMappingResult


class NoblePhantasmResult(BaseModel):
    """보구 생성 결과"""
    보구명: str
    진명개방: str


class FlavorTextResult(BaseModel):
    """플레이버 텍스트 생성 결과"""
    flavorText: str


async def generate_noble_phantasm(
    lore: LoreMappingResult,
    gender: str,
    attribute: str,
    type: str,
    exclude_noble_phantasms: list[dict[str, str]] | None = None,
) -> NoblePhantasmResult:
    """
    GPT API를 호출하여 보구 정보 생성.
    캐릭터의 세계관 설정과 카드 설정을 기반으로 보구명과 진명개방을 생성합니다.
    """
    api_key = getattr(settings, "OPENAI_API_KEY", None) or ""
    if not api_key:
        raise ValueError("OPENAI_API_KEY가 설정되지 않았습니다.")

    client = AsyncOpenAI(api_key=api_key)

    system_prompt = """
You are a Fate/strange Fake and Fate/stay night lore expert.
Generate a Noble Phantasm (보구) for the given character based on their lore and card settings.
Return ONLY valid JSON matching the provided schema. Do NOT include extra commentary.

**Language Format:**
- 보구명: Return in Korean only (no English). Example: "약속된 승리의 검"
- 진명개방: Return in "한국어(English)" format. Example: "엑스칼리버(Excalibur)"

A Noble Phantasm (보구, 宝具) is a Servant's identity, representing weapons, techniques, or famous episodes from their legend.
보구(宝具, Noble Phantasm)는 서번트의 아이덴티티로, 생전에 사용하던 무구나 기술, 유명한 일화를 구현한 것입니다.
보구는 해당 영웅이 전승·전설에서 남긴 핵심 무기/능력/현상으로 작성해줘.

The True Name Release (진명개방, 真名解放) is the act of calling out the true name of the Noble Phantasm to unleash its full power.
진명개방(真名解放)은 보구의 진정한 힘을 끌어내기 위해 진정한 보구의 이름을 외쳐 파장을 일치시키는 것입니다.
진명개방은 보구의 진정한 이름을 외치는 짧은 구절(보통 2-5단어)로 작성해줘.

IMPORTANT:
- Generate ONE Noble Phantasm that fits the character's lore and card settings.
- The Noble Phantasm should reflect the character's historical/mythical background, era, archetype, legend rank, mystery level, divinity potential, and key achievements.
- The Noble Phantasm should be appropriate for the card's gender, attribute, and class.
- The Noble Phantasm name (보구명) should be in Korean only (no English parentheses).
- The True Name Release (진명개방) should be in "한국어(English)" format - a short phrase (typically 2-5 words) that represents the Noble Phantasm's true name.
- If excludeNoblePhantasms is provided, DO NOT generate any Noble Phantasm that matches those names or true names.
- The Noble Phantasm must be distinct and unique, fitting the character's legend and achievements.

Examples:
- 보구명: "약속된 승리의 검", 진명개방: "엑스칼리버(Excalibur)"
- 보구명: "왕의 재보", 진명개방: "게이트 오브 바빌론(Gate of Babylon)"
- 보구명: "천공의 검", 진명개방: "헤븐즈 필(Heaven's Feel)"
"""

    # 캐릭터 설정 정보 구성
    character_settings = f"""
Character Settings:
- Name: {lore.name}
- Historical/Mythical: {lore.historical_or_mythical}
- Origin Country: {lore.origin_country or "Unknown"}
- Era: {lore.era}
- Main Archetype: {lore.main_archetype}
- Legend Rank: {lore.legend_rank}
- Mystery Level: {lore.mystery_level}
- Divinity Potential: {lore.divinity_potential}
- Key Achievements: {', '.join(lore.key_achievements) if lore.key_achievements else "None"}
"""

    # 카드 설정 정보
    card_settings = f"""
Card Settings:
- Gender: {gender}
- Attribute: {attribute}
- Class: {type}
"""

    # 기존 보구 제외 지시
    exclude_instruction = ""
    if exclude_noble_phantasms and len(exclude_noble_phantasms) > 0:
        exclude_list = []
        for np in exclude_noble_phantasms:
            np_name = np.get("보구명", "")
            true_name = np.get("진명개방", "")
            if np_name:
                exclude_list.append(f"보구명: {np_name}")
            if true_name:
                exclude_list.append(f"진명개방: {true_name}")
        
        if exclude_list:
            exclude_instruction = f"""
EXCLUSION REQUIREMENT:
The following Noble Phantasms are already assigned. DO NOT generate any Noble Phantasm that matches these:
{chr(10).join(f"- {item}" for item in exclude_list)}

Generate a DIFFERENT Noble Phantasm that is distinct from the excluded ones.
"""

    user_prompt = f"""
{character_settings}

{card_settings}

{exclude_instruction}

Generate a Noble Phantasm (보구) for this character according to Nasuverse rules.
The Noble Phantasm should:
1. Reflect the character's historical/mythical background, era, archetype, legend rank, mystery level, divinity potential, and key achievements
2. Be appropriate for the card's gender, attribute, and class
3. Represent a core weapon, ability, or phenomenon from the character's legend and achievements
4. Be distinct from any excluded Noble Phantasms (if provided)
5. Follow Fate/strange Fake universe adaptation rules

Return values in the specified format:
- 보구명: Korean only (no English parentheses)
- 진명개방: "한국어(English)" format - a short phrase (typically 2-5 words) that represents the Noble Phantasm's true name
"""

    response = await client.responses.parse(
        model="gpt-4o-mini",
        input=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        text_format=NoblePhantasmResult,
    )

    try:
        result: NoblePhantasmResult = response.output_parsed
        return result
    except ValidationError as e:
        raise ValueError(f"Schema validation failed: {e}") from e


async def generate_flavor_text(
    lore: LoreMappingResult,
    gender: str,
    attribute: str,
    type: str,
) -> FlavorTextResult:
    """
    GPT API를 호출하여 플레이버 텍스트 생성.
    캐릭터의 세계관 설정과 카드 설정을 기반으로 캐릭터의 말투를 반영한 대사를 생성합니다.
    """
    api_key = getattr(settings, "OPENAI_API_KEY", None) or ""
    if not api_key:
        raise ValueError("OPENAI_API_KEY가 설정되지 않았습니다.")

    client = AsyncOpenAI(api_key=api_key)

    system_prompt = """
You are a Fate/strange Fake and Fate/stay night character dialogue writer.
Generate a flavor text (플레이버 텍스트) - a quote or dialogue that reflects the character's personality and speech pattern.
Return ONLY valid JSON matching the provided schema. Do NOT include extra commentary.

**Language: Return all text fields in Korean.**

The flavor text should:
- Reflect the character's personality, speech pattern, and speaking style
- Be appropriate for the character's historical/mythical background
- Match the character's era, archetype, and legend rank
- Be a short, memorable quote (typically 10-30 characters)
- Sound natural and fitting for the character
"""

    # 캐릭터 설정 정보 구성
    character_settings = f"""
Character Settings:
- Name: {lore.name}
- Historical/Mythical: {lore.historical_or_mythical}
- Origin Country: {lore.origin_country or "Unknown"}
- Era: {lore.era}
- Main Archetype: {lore.main_archetype}
- Legend Rank: {lore.legend_rank}
- Mystery Level: {lore.mystery_level}
- Divinity Potential: {lore.divinity_potential}
- Key Achievements: {', '.join(lore.key_achievements) if lore.key_achievements else "None"}
"""

    # 카드 설정 정보
    card_settings = f"""
Card Settings:
- Gender: {gender}
- Attribute: {attribute}
- Class: {type}
"""

    user_prompt = f"""
{character_settings}

{card_settings}

Generate a flavor text (플레이버 텍스트) - a quote or dialogue for this character.
The flavor text should:
1. Reflect the character's personality and speech pattern based on their historical/mythical background
2. Match the character's era, archetype, and legend rank
3. Be appropriate for the card's gender, attribute, and class
4. Be a short, memorable quote that sounds natural for the character
5. Be written in Korean

Return the result as a single quote or dialogue line.
"""

    response = await client.responses.parse(
        model="gpt-4o-mini",
        input=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        text_format=FlavorTextResult,
    )

    try:
        result: FlavorTextResult = response.output_parsed
        return result
    except ValidationError as e:
        raise ValueError(f"Schema validation failed: {e}") from e


async def generate_card_data(
    lore: LoreMappingResult,
    gender: str,
    attribute: str,
    type: str,
    exclude_noble_phantasms: list[dict[str, str]] | None = None,
) -> dict:
    """
    한 번에 보구1, 보구2, 플레이버 텍스트를 생성합니다.
    """
    # 보구1 생성
    noble_phantasm1 = await generate_noble_phantasm(
        lore=lore,
        gender=gender,
        attribute=attribute,
        type=type,
        exclude_noble_phantasms=exclude_noble_phantasms,
    )
    
    # 보구1을 제외 목록에 추가
    updated_exclude_list = (exclude_noble_phantasms or []).copy()
    updated_exclude_list.append({
        "보구명": noble_phantasm1.보구명,
        "진명개방": noble_phantasm1.진명개방,
    })
    
    # 보구2 생성 (보구1 제외)
    noble_phantasm2 = await generate_noble_phantasm(
        lore=lore,
        gender=gender,
        attribute=attribute,
        type=type,
        exclude_noble_phantasms=updated_exclude_list,
    )
    
    # 플레이버 텍스트 생성
    flavor_text_result = await generate_flavor_text(
        lore=lore,
        gender=gender,
        attribute=attribute,
        type=type,
    )
    
    return {
        "noblePhantasm1": {
            "보구명": noble_phantasm1.보구명,
            "진명개방": noble_phantasm1.진명개방,
        },
        "noblePhantasm2": {
            "보구명": noble_phantasm2.보구명,
            "진명개방": noble_phantasm2.진명개방,
        },
        "flavorText": flavor_text_result.flavorText,
    }
