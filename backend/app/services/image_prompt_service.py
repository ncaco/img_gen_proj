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
- SPECIAL CLASS REQUIREMENT: If the class is Saber, the prompt MUST include a sword-type weapon. Saber class characters must be depicted with a sword (sword, blade, katana, etc.). This is MANDATORY for Saber class.
- SPECIAL CLASS REQUIREMENT: If the class is Lancer, the prompt MUST include a spear-type weapon. Lancer class characters must be depicted with a spear or lance (spear, lance, polearm, etc.). This is MANDATORY for Lancer class.
- SPECIAL CLASS REQUIREMENT: If the class is Archer, the prompt MUST include a bow-type weapon. Archer class characters must be depicted with a bow (bow, longbow, crossbow, etc.). This is MANDATORY for Archer class.
- SPECIAL CLASS REQUIREMENT: If the class is Rider, the prompt MUST include at least one phantasmal beast, mythical creature, or mount. Rider class characters must be depicted with their mount/beast companion. This is MANDATORY for Rider class.
- SPECIAL CLASS REQUIREMENT: If the class is Berserker, the prompt MUST include berserker rage effects such as violent aura, fury, madness, aggressive expression, wild eyes, and intense combat atmosphere. Berserker class characters must show signs of berserker rage and madness. This is MANDATORY for Berserker class.
- SPECIAL CLASS REQUIREMENT: If the class is Ruler, the prompt MUST include judge/priest-like elements such as authoritative presence, dignified appearance, judicial or religious symbols, sacred atmosphere, and a sense of justice and divine authority. Ruler class characters must convey the feeling of a judge or high priest. This is MANDATORY for Ruler class.
- SPECIAL CLASS REQUIREMENT: If the class is Avenger, the prompt MUST include curse effects, torn/tattered clothing, and NO weapons. Avenger class characters must show signs of curses, wear torn or tattered clothes, and must NOT have any weapons. This is MANDATORY for Avenger class.
- SPECIAL CLASS REQUIREMENT: If the class is Alter Ego, the prompt MUST include mechanical-organic hybrid design, asymmetrical structure, digital glitch effects, surreal and dreamlike atmosphere, and express the duality of "another self". Alter Ego class characters must show a fusion of mechanical and organic elements, asymmetrical body structure, digital glitch effects, and surreal dreamlike atmosphere representing dual identity. This is MANDATORY for Alter Ego class.
- These three elements (Gender, Attribute, Class) are MANDATORY and must be prominently featured in the prompt.

STRICT RULES:
- Do NOT change lore or Servant settings.
- Do NOT add new Noble Phantasms.
- Do NOT include gameplay or combat stats.
- NO text, NO UI, NO watermark, NO logo, NO letters in image.

Return ONLY valid JSON matching the schema.
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
- Noble Phantasms: {', '.join([np.get('보구명', '') for np in (lore.noble_phantasms or [])]) if lore.noble_phantasms else "None"}
- Key Achievements: {', '.join(lore.key_achievements) if lore.key_achievements else "None"}
"""

    user_prompt = f"""
Lore Mapping (JSON):
{lore.model_dump_json(indent=2)}

{character_settings}

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
{f"   CRITICAL CLASS REQUIREMENT FOR SABER: The prompt MUST include a sword-type weapon. The Saber class character must be shown with a sword (sword, blade, katana, longsword, broadsword, etc.). This is MANDATORY - Saber class characters always have a sword. Include descriptions like 'sword', 'blade', 'katana', 'longsword', 'broadsword', 'wielding a sword', 'holding a sword', etc." if type.lower() in ["saber", "세이버"] else ""}
{f"   CRITICAL CLASS REQUIREMENT FOR LANCER: The prompt MUST include a spear-type weapon. The Lancer class character must be shown with a spear or lance (spear, lance, polearm, halberd, etc.). This is MANDATORY - Lancer class characters always have a spear or lance. Include descriptions like 'spear', 'lance', 'polearm', 'halberd', 'wielding a spear', 'holding a lance', etc." if type.lower() in ["lancer", "랜서"] else ""}
{f"   CRITICAL CLASS REQUIREMENT FOR ARCHER: The prompt MUST include a bow-type weapon. The Archer class character must be shown with a bow (bow, longbow, crossbow, composite bow, etc.). This is MANDATORY - Archer class characters always have a bow. Include descriptions like 'bow', 'longbow', 'crossbow', 'composite bow', 'wielding a bow', 'holding a bow', 'with bow and arrow', etc." if type.lower() in ["archer", "아처"] else ""}
{f"   CRITICAL CLASS REQUIREMENT FOR RIDER: The prompt MUST include at least one phantasmal beast, mythical creature, or mount. The Rider class character must be shown with their mount/beast companion. This is MANDATORY - Rider class characters always have mounts or phantasmal beasts. Include descriptions like 'riding a mythical beast', 'with phantasmal mount', 'accompanied by a legendary creature', etc." if type.lower() in ["rider", "라이더"] else ""}
{f"   CRITICAL CLASS REQUIREMENT FOR BERSERKER: The prompt MUST include berserker rage effects such as violent aura, fury, madness, aggressive expression, wild eyes, intense combat atmosphere, berserker rage, and signs of madness. The Berserker class character must show clear signs of berserker rage and madness. This is MANDATORY - Berserker class characters always exhibit berserker rage. Include descriptions like 'berserker rage', 'violent aura', 'fury', 'madness', 'wild eyes', 'aggressive expression', 'intense combat atmosphere', etc." if type.lower() in ["berserker", "버서커"] else ""}
{f"   CRITICAL CLASS REQUIREMENT FOR RULER: The prompt MUST include judge/priest-like elements such as authoritative presence, dignified appearance, judicial or religious symbols, sacred atmosphere, sense of justice, divine authority, and regal bearing. The Ruler class character must convey the feeling of a judge or high priest. This is MANDATORY - Ruler class characters always have judge/priest-like qualities. Include descriptions like 'judge-like', 'priest-like', 'authoritative presence', 'dignified appearance', 'judicial symbols', 'religious symbols', 'sacred atmosphere', 'sense of justice', 'divine authority', 'regal bearing', etc." if type.lower() in ["ruler", "룰러"] else ""}
{f"   CRITICAL CLASS REQUIREMENT FOR AVENGER: The prompt MUST include curse effects, torn/tattered clothing, and NO weapons. The Avenger class character must show signs of curses (curse marks, curse aura, cursed appearance), wear torn or tattered clothes (ripped clothing, damaged garments, worn-out fabric), and must NOT have any weapons (no sword, no spear, no bow, no staff, completely unarmed). This is MANDATORY - Avenger class characters always have curses, torn clothing, and no weapons. Include descriptions like 'cursed', 'curse marks', 'curse aura', 'torn clothing', 'tattered clothes', 'ripped garments', 'damaged fabric', 'no weapons', 'unarmed', 'weaponless', etc." if type.lower() in ["avenger", "어벤저"] else ""}
{f"   CRITICAL CLASS REQUIREMENT FOR ALTER EGO: The prompt MUST include mechanical-organic hybrid design, asymmetrical structure, digital glitch effects, surreal and dreamlike atmosphere, and express the duality of 'another self'. The Alter Ego class character must show a fusion of mechanical and organic elements (cyborg-like features, biomechanical design, mechanical parts fused with organic body), asymmetrical body structure (uneven proportions, mismatched limbs, non-symmetrical design), digital glitch effects (pixelation, data corruption, digital artifacts, glitch aesthetics), surreal and dreamlike atmosphere (ethereal, otherworldly, dreamy, surreal), and dual identity expression (split personality, multiple selves, identity duality). This is MANDATORY - Alter Ego class characters always have these characteristics. Include descriptions like 'mechanical-organic hybrid', 'cyborg', 'biomechanical', 'asymmetrical', 'uneven proportions', 'digital glitch', 'pixelation', 'data corruption', 'surreal', 'dreamlike', 'ethereal', 'dual identity', 'another self', 'split personality', etc." if type.lower() in ["alter ego", "얼터에고", "alterego"] else ""}
4. Character settings information - incorporate the character's historical/mythical background, era, archetype, legend rank, mystery level, divinity potential, and key achievements into the visual design and atmosphere

Generate a Fate-style anime illustration prompt for this Servant in landscape (16:9) format.
Make sure Gender, Attribute (elemental), Class, and Character Settings are clearly and explicitly expressed in the prompt.
The prompt should reflect the character's background, era, archetype, and achievements in the visual design.
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
