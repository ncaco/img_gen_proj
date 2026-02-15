"""
이미지 프롬프트 생성 서비스
"""
from openai import AsyncOpenAI
from pydantic import ValidationError

from app.core.config import settings
from app.schemas.lore import LoreMappingResult
from app.schemas.image_prompt import ImagePromptResult


def normalize_image_prompt(prompt: str) -> str:
    """이미지 프롬프트 정규화"""
    required_tokens = [
        "anime illustration",
        "Type-Moon official art style",
        "cinematic lighting",
        "dramatic background",
        "wide horizontal composition",
        "16:9 landscape",
        "no text",
        "no UI",
        "no watermark",
        "no logo",
        "no letters",
    ]

    normalized = prompt.strip()

    lower = normalized.lower()
    for token in required_tokens:
        if token.lower() not in lower:
            normalized += f", {token}"

    return normalized


def normalize_negative_prompt(negative: str) -> str:
    """네거티브 프롬프트 정규화"""
    required_negative = [
        "text",
        "logo",
        "watermark",
        "UI",
        "signature",
        "subtitles",
        "low resolution",
        "blurry",
        "bad anatomy",
        "extra fingers",
        "extra arms",
        "deformed",
    ]

    normalized = negative.strip()
    lower = normalized.lower()

    for token in required_negative:
        if token.lower() not in lower:
            normalized += f", {token}"

    return normalized


async def run_image_prompt_generator(
    lore: LoreMappingResult,
    gender: str,
    attribute: str,
    type: str,
) -> tuple[ImagePromptResult, dict]:
    """이미지 프롬프트 생성"""
    api_key = getattr(settings, "OPENAI_API_KEY", None) or ""
    if not api_key:
        raise ValueError("OPENAI_API_KEY가 설정되지 않았습니다.")

    client = AsyncOpenAI(api_key=api_key)

    system_prompt = """
    당신은 Fate 시리즈 스타일의 애니메이션 서번트 일러스트를 위한 전문 프롬프트 엔지니어입니다.

    [역할]
    - 결과물은 반드시 "이미지 생성용 프롬프트"만 출력합니다.
    - 설명, 해설, 주석은 절대 출력하지 않습니다.
    - moe 스타일의 캐릭터 디자인을 기반으로 합니다.
    - Fate 세계관의 톤, 분위기, 미학을 존중합니다.
    - 서번트의 클래스, 속성, 성별, 시대적 배경을 시각적으로 정확히 반영해야 합니다.
    - 와이드 시네마틱 구도 (16:9, 가로형)를 사용합니다.
    - 모든 프롬프트는 반드시 영어(English)로 작성합니다.

    [출력 JSON 스키마 - 위반 불가]
    {
    "prompt": "이미지 생성용 메인 프롬프트 (영문)",
    "negative_prompt": "금지 요소 네거티브 프롬프트 (영문)"
    }

    [핵심 필수 요소 - 반드시 명시적으로 포함]
    0. 설정 (Settings)
    - 대상의 시대적 배경과 평판을 반영하는 설정을 포함합니다.

    1. 성별 (Gender)
    - 외형, 체형, 복장, 분위기에서 명확히 드러나야 합니다.

    2. 속성 (Attribute / 원소 속성)
    - Fire / Water / Wind / Earth / Light / Dark / Steel / Ice / Forest / Lightning 등
    - 색감, 이펙트, 오라, 환경 연출을 통해 강하게 표현해야 합니다.
    - Attribute 표현은 배경, 이펙트, 색조에서 가장 먼저 인식되어야 합니다.
    - 캐릭터 디테일보다 속성 연출이 시각적으로 우선합니다.

    3. 클래스 (Class)
    - 포즈, 무기, 실루엣, 전투 스타일에 반드시 반영
    - 클래스가 첫눈에 식별 가능해야 합니다.

    [클래스별 절대 규칙 – 위반 불가]
    - Saber:
    반드시 소드 계열 무기 포함 (sword, blade, katana, longsword, rapier 등)

    - Lancer:
    반드시 장병기 계열 포함 (spear, lance, polearm, halberd, great axe 등)

    - Archer:
    반드시 원거리 무기 포함 (bow, longbow, crossbow)
    - 현대 화기(총기, 미사일, 레이저)는 설정상 정당화되지 않는 한 사용하지 않습니다.

    - Rider:
    반드시 환상종 / 탈것 / 신수 중 최소 1종 포함 (mount, phantom beast, divine beast 등)

    - Caster:
    반드시 마법 계열 포함 (magic circle, spellbook, staff, wand 등)

    - Berserker:
    광기, 분노, 폭주 오라, 난폭한 표정 필수

    - Ruler:
    재판관 / 사제 / 성직자적 요소 필수 (authority, divine, judge, cleric imagery)

    - Avenger:
    저주 효과 필수
    찢어진 복장 필수
    무기 절대 금지 (완전 무장 해제 상태)
    - 반드시 고통, 집착, 증오가 드러나는 신체 언어를 포함해야 합니다.
    - 방어적이거나 위엄적인 포즈 금지

    - Alter Ego:
    기계 + 유기체 융합 디자인
    비대칭 구조
    디지털 글리치
    몽환적이고 초현실적인 분위기
    '또 다른 자아'의 이중성 표현 필수
    - 신체 비율의 왜곡, 비정상적인 실루엣을 허용합니다.

    [금지 사항]
    - 설정에 없는 새로운 보구 추가 금지
    - 게임 UI, 수치, 텍스트 정보 금지
    - 이미지 내 텍스트, 로고, 워터마크, UI, 글자 절대 금지

    [네거티브 프롬프트 필수 포함 항목]
    - 항상 negative_prompt에 아래 항목을 포함합니다:
    low resolution, blurry, bad anatomy, extra fingers, extra limbs,
    deformed, mutated, cropped, out of frame, watermark, logo, text, UI

    [출력 규칙]
    - 반드시 JSON만 출력합니다.
    - JSON 이외의 텍스트는 절대 출력하지 않습니다.
    """

    user_prompt = f"""
    [Lore Mapping - JSON]
    {lore.model_dump_json(indent=2)}

    [Character Summary]
    - Name: {lore.name}
    - Historical/Mythical: {lore.historical_or_mythical}
    - Origin Country: {lore.origin_country or "Unknown"}
    - Era: {lore.era}
    - Main Archetype: {lore.main_archetype}
    - Legend Rank: {lore.legend_rank}
    - Mystery Level: {lore.mystery_level}
    - Divinity Potential: {lore.divinity_potential}
    - Noble Phantasms: {', '.join([np.get('보구명', '') for np in (lore.noble_phantasms or [])]) if lore.noble_phantasms else "None"}
    - Key Achievements: {', '.join(lore.key_achievements) if lore.key_achievements else "None"}

    [Core Requirements - Must Reflect in Prompt]
    - Gender: {gender}
    - Attribute: {attribute}
    - Class: {type}

    [Important Instructions]
    - Gender ({gender}) must be clearly visible in appearance, silhouette, outfit, and vibe.
    - Attribute ({attribute}) must dominate the overall palette, aura, effects, and environment.
    - Class ({type}) must be instantly recognizable through weapon, pose, and combat style.
    - Era, legend scale, archetype, and achievements must blend naturally into the scene.
    - Keep the tone aligned with Fate official illustration aesthetics.
    - Combine moe character design with cinematic staging.
    - Use wide horizontal 16:9 composition.
    - No text, no UI, no logo, no watermark, no letters in the image.

    [Final Goal]
    Write an image-generation prompt for a high-quality Fate-style servant illustration.

    Output must be JSON only, matching the required schema.
    """

    response = await client.responses.parse(
        model="gpt-5-mini",
        input=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        text_format=ImagePromptResult,
    )

    usage = None
    if getattr(response, "usage", None):
        u = response.usage
        inp = getattr(u, "input_tokens", None) or getattr(u, "prompt_tokens", None)
        out = getattr(u, "output_tokens", None) or getattr(u, "completion_tokens", None)
        if inp is not None and out is not None:
            usage = {"input_tokens": inp, "output_tokens": out}

    try:
        result: ImagePromptResult = response.output_parsed
        
        # 캐릭터 설정 정보 구성
        character_settings_dict = {
            "name": lore.name,
            "historicalOrMythical": lore.historical_or_mythical,
            "originCountry": lore.origin_country,
            "era": lore.era,
            "mainArchetype": lore.main_archetype,
            "legendRank": lore.legend_rank,
            "mysteryLevel": lore.mystery_level,
            "divinityPotential": lore.divinity_potential,
            "noblePhantasms": lore.noble_phantasms or [],
            "keyAchievements": lore.key_achievements or [],
            "gender": gender,
            "attribute": attribute,
            "class": type,
        }
        
        # 결과, 캐릭터 설정 정보, usage 튜플로 반환
        return result, character_settings_dict, usage
    except ValidationError as e:
        raise ValueError(f"Schema validation failed: {e}") from e


def run_prompt_postprocess(step3: ImagePromptResult, character_settings: dict) -> tuple[ImagePromptResult, dict]:
    """프롬프트 후처리"""
    cleaned_prompt = normalize_image_prompt(step3.landscape_image_prompt_en)
    cleaned_negative = normalize_negative_prompt(step3.negative_prompt_en)

    return (
        ImagePromptResult(
            landscape_image_prompt_en=cleaned_prompt,
            negative_prompt_en=cleaned_negative,
        ),
        character_settings,  # 캐릭터 설정 정보 유지
    )
