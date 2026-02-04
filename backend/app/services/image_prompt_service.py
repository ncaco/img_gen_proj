"""
이미지 프롬프트 생성 서비스
"""
from openai import OpenAI
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


def run_image_prompt_generator(
    lore: LoreMappingResult,
    gender: str,
    attribute: str,
    type: str,
) -> ImagePromptResult:
    """이미지 프롬프트 생성"""
    api_key = getattr(settings, "OPENAI_API_KEY", None) or ""
    if not api_key:
        raise ValueError("OPENAI_API_KEY가 설정되지 않았습니다.")

    client = OpenAI(api_key=api_key)

    system_prompt = """
You are an anime illustration prompt engineer for Fate-style characters.

TASK:
- Generate ONLY image generation prompts.
- Use moe-style character design.
- Respect the Servant class, era, and core concept.
- Apply natural Fate-style gender adaptation.
- Create a wide horizontal (16:9) cinematic composition.

CRITICAL REQUIREMENTS:
- The prompt MUST explicitly include and emphasize the character's Gender, Attribute, and Class.
- Gender should be clearly reflected in the character's appearance and design.
- Attribute (Fire/Water/Wind/Earth/Light/Dark/etc. - elemental attributes) should influence the visual style, color scheme, aura, and atmosphere. For example, Fire attribute should show flames, red/orange colors, and fiery effects. Water attribute should show blue colors, water effects, and fluid elements.
- Class (Saber/Archer/Lancer/etc.) should be reflected in the character's pose, weapons, and overall design.
- These three elements (Gender, Attribute, Class) are MANDATORY and must be prominently featured in the prompt.

STRICT RULES:
- Do NOT change lore or Servant settings.
- Do NOT add new Noble Phantasms.
- Do NOT include gameplay or combat stats.
- NO text, NO UI, NO watermark, NO logo, NO letters in image.

Return ONLY valid JSON matching the schema.
"""

    user_prompt = f"""
Lore Mapping (JSON):
{lore.model_dump_json(indent=2)}

Servant Configuration (MUST be prominently featured in the prompt):
- Gender: {gender}
- Attribute: {attribute}
- Class: {type}

IMPORTANT: The generated prompt MUST explicitly and clearly include:
1. The character's gender ({gender}) - reflected in appearance, clothing, and design
2. The attribute ({attribute}) - this is an ELEMENTAL attribute (Fire/Water/Wind/Earth/Light/Dark/etc.). The prompt must include visual elements that represent this element:
   - Fire: flames, red/orange colors, fiery effects, heat waves
   - Water: blue colors, water effects, fluid elements, aquatic atmosphere
   - Wind: flowing elements, air currents, ethereal effects
   - Earth: brown/green colors, solid/grounded elements, nature
   - Light: bright colors, light effects, radiant atmosphere
   - Dark: dark colors, shadow effects, mysterious atmosphere
   The attribute should be prominently featured in the visual style, color scheme, aura, and atmosphere.
3. The class ({type}) - reflected in pose, weapons, equipment, and overall character design

Generate a Fate-style anime illustration prompt for this Servant in landscape (16:9) format.
Make sure Gender, Attribute (elemental), and Class are clearly and explicitly expressed in the prompt.
"""

    response = client.responses.parse(
        model="gpt-4o-mini",
        input=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        text_format=ImagePromptResult,
    )

    try:
        result: ImagePromptResult = response.output_parsed
        return result
    except ValidationError as e:
        raise ValueError(f"Schema validation failed: {e}") from e


def run_prompt_postprocess(step3: ImagePromptResult) -> ImagePromptResult:
    """프롬프트 후처리"""
    cleaned_prompt = normalize_image_prompt(step3.landscape_image_prompt_en)
    cleaned_negative = normalize_negative_prompt(step3.negative_prompt_en)

    return ImagePromptResult(
        landscape_image_prompt_en=cleaned_prompt,
        negative_prompt_en=cleaned_negative,
    )
