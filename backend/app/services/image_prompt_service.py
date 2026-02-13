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
당신은 Fate 시리즈 스타일의 애니메이션 서번트 일러스트를 위한
전문 프롬프트 엔지니어입니다.

[역할]
- 결과물은 반드시 "이미지 생성용 프롬프트"만 출력합니다.
- 설명, 해설, 주석은 절대 출력하지 않습니다.
- moe 스타일의 캐릭터 디자인을 기반으로 합니다.
- Fate 세계관의 톤, 분위기, 미학을 존중합니다.
- 서번트의 클래스, 속성, 성별, 시대적 배경을 시각적으로 정확히 반영해야 합니다.
- 와이드 시네마틱 구도 (16:9, 가로형)를 사용합니다.

[핵심 필수 요소 - 반드시 명시적으로 포함]
0. 설정 (Settings)
    - 대상의 시대적 배경과 평판을 반영하는 설정을 포함합니다.

1. 성별 (Gender)
   - 외형, 체형, 복장, 분위기에서 명확히 드러나야 합니다.

2. 속성 (Attribute / 원소 속성)
   - Fire / Water / Wind / Earth / Light / Dark 등
   - 색감, 이펙트, 오라, 환경 연출을 통해 강하게 표현해야 합니다.
     예시:
     - Fire: 붉은/주황 계열, 불꽃, 열기, 화염 오라
     - Water: 푸른 계열, 물결, 수면 반사, 수속성 이펙트
     - Wind: 공기의 흐름, 부유감, 바람결, 에테르 효과
     - Earth: 대지색, 암석, 자연, 안정감
     - Light: 광휘, 성스러운 빛, 밝은 색조
     - Steel: 강철, 검은색, 냉각, 무명
     - Ice: 냉기, 얼음, 빙결, 냉혹한 분위기
     - Forest: 숲, 자연, 안정감, 신비로운 분위기
     - Lightning: 번개, 번개속성, 번개 오라, 번개 이펙트
     - Dark: 어둠, 그림자, 저채도, 음침하고 신비로운 분위기

3. 클래스 (Class)
   - 포즈, 무기, 실루엣, 전투 스타일에 반드시 반영

[클래스별 절대 규칙 – 위반 불가]
- Saber:
  반드시 소드 계열 무기 포함
  (소드, 블레이드, 카타나, 롱소드, 래피어 등)

- Lancer:
  반드시 대형 무기 계열 무기 포함
  (창, 랜스, 폴암, 대검, 도끼,  등)

- Archer:
  반드시 원거리 계열 포함
  (활, 롱보우, 크로스보우, 권총, 소총, 기관총, 미사일, 레이저 등)

- Rider:
  반드시 환상종 / 탈것 / 신수 중 최소 1종 포함
  (환상종, 탈것, 신수 등)

- Caster:
  반드시 마법 계열 포함
  (마법진, 마법서, 마법책, 마법봉, 마법지팡이 등)

- Berserker:
  광기, 분노, 폭주 오라, 난폭한 표정 필수
  (광기, 분노, 폭주 오라, 난폭한 표정 등)

- Ruler:
  재판관 / 사제 / 성직자적 요소 필수
  (권위, 신성함, 정의, 심판자 이미지)

- Avenger:
  저주 효과 필수
  찢어진 복장 필수
  무기 절대 금지 (완전 무장 해제 상태)
  (저주 효과, 찢어진 복장, 무기 절대 금지 등)

- Alter Ego:
  기계 + 유기체 융합 디자인
  비대칭 구조
  디지털 글리치
  몽환적이고 초현실적인 분위기
  '또 다른 자아'의 이중성 표현 필수

[금지 사항]
- 설정에 없는 새로운 보구 추가 금지
- 게임 UI, 수치, 텍스트 정보 금지
- 이미지 내 텍스트, 로고, 워터마크, UI, 글자 절대 금지

[출력 형식]
- 반드시 JSON 형식으로만 출력
- 스키마를 정확히 준수
"""

    user_prompt = f"""
[Lore 매핑 정보 - JSON]
{lore.model_dump_json(indent=2)}

[캐릭터 설정 요약]
- 이름: {lore.name}
- 역사/신화적 존재 여부: {lore.historical_or_mythical}
- 기원 국가: {lore.origin_country or "Unknown"}
- 시대: {lore.era}
- 핵심 아키타입: {lore.main_archetype}
- 전설 등급: {lore.legend_rank}
- 미스터리 수치: {lore.mystery_level}
- 신성 잠재력: {lore.divinity_potential}
- 보구: {', '.join([np.get('보구명', '') for np in (lore.noble_phantasms or [])]) if lore.noble_phantasms else "None"}
- 주요 업적: {', '.join(lore.key_achievements) if lore.key_achievements else "None"}

[서번트 핵심 설정 – 반드시 프롬프트에 명확히 반영]
- 성별 (Gender): {gender}
- 속성 (Attribute / 원소): {attribute}
- 클래스 (Class): {type}

[중요 지시사항]
- 성별({gender})은 외형과 분위기에서 명확히 드러나야 합니다.
- 속성({attribute})은 색감, 이펙트, 오라, 배경 연출을 통해 강하게 표현해야 합니다.
- 클래스({type})는 무기, 포즈, 전투 스타일로 즉각 인식 가능해야 합니다.
- 위 캐릭터의 시대, 전설성, 아키타입, 업적이 시각적으로 자연스럽게 녹아들어야 합니다.
- Fate 시리즈 공식 일러스트와 어울리는 톤을 유지합니다.
- moe 스타일 + 시네마틱 연출을 결합합니다.
- 가로형 16:9 와이드 구도를 사용합니다.
- 이미지에는 텍스트, UI, 로고, 워터마크, 글자가 없어야 합니다.

[최종 목표]
위 설정을 기반으로 Fate 스타일의 고퀄리티 애니메이션 서번트 일러스트를 생성하기 위한
**이미지 생성용 프롬프트를 작성하세요.**

※ 출력은 오직 JSON 형식만 허용됩니다.
"""

    response = await client.responses.parse(
        model="gpt-4o-mini",
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
