"""
인스타그램 캡션(한 줄 소개, 본문, 해시태그) AI 생성 서비스
"""
from typing import Literal
from openai import AsyncOpenAI

from app.core.config import settings

CaptionField = Literal["firstLine", "body", "hashtags"]


async def generate_instagram_caption_single(
    card_name: str,
    card_type: str,
    attribute: str,
    rarity: str,
    field: CaptionField,
    gender: str | None = None,
    flavor_text: str | None = None,
    series: str | None = None,
) -> str:
    """
    카드 정보를 바탕으로 인스타그램용 한 가지 항목만 AI로 생성합니다.
    field: "firstLine" | "body" | "hashtags"
    Returns: 생성된 문자열
    """
    api_key = getattr(settings, "OPENAI_API_KEY", None) or ""
    if not api_key:
        raise ValueError("OPENAI_API_KEY가 설정되지 않았습니다.")

    client = AsyncOpenAI(api_key=api_key)
    card_info = f"""
카드 정보:
- 카드명: {card_name}
- 타입(클래스): {card_type}
- 속성: {attribute}
- 등급: {rarity}
- 성별: {gender or "미지정"}
- 시리즈: {series or "미지정"}
- 플레이버 텍스트: {flavor_text or "없음"}
""".strip()

    if field == "firstLine":
        system_prompt = """You are an expert at writing Instagram caption hooks for trading card / character illustration posts.
Generate ONLY one short catchy line in Korean for the caption preview. No hashtags.
Under 50 characters. Engaging and fitting for the card. Return ONLY the line, no quotes, no JSON."""
    elif field == "body":
        system_prompt = """You are an expert at writing Instagram caption body text for trading card / character illustration posts.
Generate 2-4 sentences in Korean introducing the card, mood, or story. Natural and engaging. No hashtags.
Return ONLY the body text, no JSON, no extra labels."""
    else:  # hashtags
        system_prompt = """You are an expert at Instagram hashtags for trading card / character illustration posts.
Generate 5-10 hashtags in Korean or English, space-separated, each starting with #.
Mix of generic (e.g. #카드 #일러스트) and specific to the card (name, type, attribute).
Return ONLY the hashtags in one line, e.g. #태그1 #태그2 #태그3"""

    user_prompt = f"""Generate the requested part for this card:\n\n{card_info}"""

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.7,
    )
    content = (response.choices[0].message.content or "").strip()
    if field == "hashtags":
        parts = [t.strip() for t in content.split() if t.strip()]
        content = " ".join(p if p.startswith("#") else f"#{p}" for p in parts)
    return content


async def generate_instagram_caption(
    card_name: str,
    card_type: str,
    attribute: str,
    rarity: str,
    gender: str | None = None,
    flavor_text: str | None = None,
    series: str | None = None,
) -> dict[str, str]:
    """
    카드 정보를 바탕으로 인스타그램용 한 줄 소개, 본문, 해시태그를 생성합니다.
    Returns: { "firstLine": "...", "body": "...", "hashtags": "#태그1 #태그2 ..." }
    """
    api_key = getattr(settings, "OPENAI_API_KEY", None) or ""
    if not api_key:
        raise ValueError("OPENAI_API_KEY가 설정되지 않았습니다.")

    client = AsyncOpenAI(api_key=api_key)

    card_info = f"""
카드 정보:
- 카드명: {card_name}
- 타입(클래스): {card_type}
- 속성: {attribute}
- 등급: {rarity}
- 성별: {gender or "미지정"}
- 시리즈: {series or "미지정"}
- 플레이버 텍스트: {flavor_text or "없음"}
""".strip()

    system_prompt = """You are an expert at writing Instagram captions for trading card / character illustration posts.
Generate a Korean Instagram caption in three parts. Return ONLY valid JSON with keys: firstLine, body, hashtags.

Rules:
- firstLine: One short catchy line (under 50 chars) for the preview. No hashtags. e.g. "오늘의 카드 - [카드명]"
- body: 2-4 sentences introducing the card, mood, or story. Natural and engaging. No hashtags here.
- hashtags: 5-10 hashtags in Korean or English, space-separated, each starting with #. Mix of generic (카드, 일러스트) and specific (card name, type, attribute).

Output format (JSON only, no markdown):
{"firstLine": "...", "body": "...", "hashtags": "#태그1 #태그2 #태그3 ..."}
"""

    user_prompt = f"""Generate an Instagram caption for this card:\n\n{card_info}"""

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.7,
    )
    content = (response.choices[0].message.content or "").strip()
    # JSON 블록 제거 (```json ... ```)
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
    content = content.strip()

    import json
    data = json.loads(content)
    first_line = (data.get("firstLine") or "").strip()
    body = (data.get("body") or "").strip()
    raw_hashtags = (data.get("hashtags") or "").strip()
    # 해시태그 공백 구분, # 없으면 추가
    parts = [t.strip() for t in raw_hashtags.split() if t.strip()]
    hashtags = " ".join(p if p.startswith("#") else f"#{p}" for p in parts)

    return {
        "firstLine": first_line,
        "body": body,
        "hashtags": hashtags,
    }
