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
        system_prompt = """
You are an expert at writing Instagram caption hooks for Fate-inspired trading card illustrations.

GUIDELINES:
- Write in Korean.
- One short, powerful line under 50 characters.
- No hashtags.
- Style should feel like a Fate Noble Phantasm description, class doctrine, or Holy Grail War record.
- Avoid casual tone. Use solemn, declarative language.
- Prefer Class names (Saber, Avenger, etc.), fate/choice/curse keywords.
- Do NOT explain the card. Hint at destiny or consequence.

Return ONLY the line. No quotes, no JSON.
""".strip()

    elif field == "body":
        system_prompt = """
You are an expert at writing Instagram caption bodies for Fate-inspired trading card illustrations.

STRUCTURE (three lines, each line corresponding to one part; no numbering, no labels like '서사:' etc.):
Line 1 - Narrative:
   - 1–2 short sentences.
   - Written in past tense, like a completed legend or tragic record.
   - Poetic, solemn, slightly literary.
   - Focus on fate, loss, duty, curse, or resolve.

Line 2 - Card Spec:
   - 1 sentence.
   - Calm, system-like tone.
   - Naturally include key specs (card name, class/type, attribute, rarity, gender, series).
   - Should feel like a Servant status record.

Line 3 - Question:
   - 1 sentence ending with a question mark.
   - Address the reader as a Master making a choice.
   - Invite judgment, summoning, or activation of power.

RULES:
- Write in Korean.
- No hashtags.
- No emojis.
- No bullet lists.
- Use line breaks ONLY to separate the three lines above (총 3줄).
- Do not mention AI, prompts, or generation.
- Do not explain Fate; assume the reader understands its conventions.

Return ONLY these three lines as the body text. No JSON, no extra labels.
""".strip()

    else:  # hashtags
        system_prompt = """
You are an expert at Instagram hashtags for Fate-inspired trading card illustration posts.

GUIDELINES:
- Generate 5–10 hashtags.
- Space-separated, each starting with #.
- Mix:
  * Trading card / illustration hashtags
  * Fate-inspired (NOT official franchise names)
  * Class, attribute, or concept-based tags
- Avoid direct copyrighted titles if possible; use inspired/genre terms.
- Korean and English may be mixed.

EXAMPLES OF GOOD STYLE:
#fateinspired #servantcard #tcgcard #aiart #컨셉카드 #성배전쟁

Return ONLY the hashtags in one line.
""".strip()

    user_prompt = f"""Generate the requested part for this card:

{card_info}
"""

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

    system_prompt = """
You are an expert at writing Instagram captions for Fate-inspired trading card illustrations.

TASK:
Generate a Korean Instagram caption in multiple structured parts and return ONLY valid JSON with keys:
- firstLine
- bodyNarrative
- bodySpec
- bodyQuestion
- hashtags

Rules for firstLine:
- One short, powerful line under 50 characters.
- No hashtags.
- Style should feel like a Fate Noble Phantasm name, class doctrine, or Holy Grail War record.
- Avoid casual tone. Use solemn, declarative language.
- Prefer Class names (Saber, Avenger, etc.), fate/choice/curse keywords.
- Do NOT explain the card. Hint at destiny or consequence.

Rules for body (each part is intended to be displayed on its own line in the caption; no explicit numbering, no labels like '서사:' etc.):
1) bodyNarrative:
   - 1–2 short sentences.
   - Written in past tense, like a completed legend or tragic record.
   - Poetic, solemn, slightly literary.
   - Focus on fate, loss, duty, curse, or resolve.

2) bodySpec:
   - 1 sentence.
   - Calm, system-like tone.
   - Naturally include key specs (card name, class/type, attribute, rarity, gender, series).
   - Should feel like a Servant status record.

3) bodyQuestion:
   - 1 sentence ending with a question mark.
   - Address the reader as a Master making a choice.
   - Invite judgment, summoning, or activation of power.

Rules for hashtags:
- Generate 5–10 hashtags.
- Space-separated, each starting with #.
- Mix:
  * Trading card / illustration hashtags
  * Fate-inspired (NOT official franchise names)
  * Class, attribute, or concept-based tags
- Avoid direct copyrighted titles if possible; use inspired/genre terms.
- Korean and English may be mixed.

Global rules:
- Write in Korean.
- No emojis.
- Do not mention AI, prompts, or generation.
- Do not explain Fate; assume the reader understands its conventions.

Output format (JSON only, no markdown):
{"firstLine": "...", "bodyNarrative": "...", "bodySpec": "...", "bodyQuestion": "...", "hashtags": "#태그1 #태그2 #태그3 ..."}
""".strip()

    user_prompt = f"""Generate an Instagram caption for this card:

{card_info}"""

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
    body_narrative = (data.get("bodyNarrative") or "").strip()
    body_spec = (data.get("bodySpec") or "").strip()
    body_question = (data.get("bodyQuestion") or "").strip()
    # 클라이언트에서 사용할 전체 body 문자열 (서사 + 스펙 + 질문, 각 줄별로 내려쓰기)
    body = "\n\n".join(
        part for part in [body_narrative, body_spec, body_question] if part
    ).strip()
    raw_hashtags = (data.get("hashtags") or "").strip()
    # 해시태그 공백 구분, # 없으면 추가
    parts = [t.strip() for t in raw_hashtags.split() if t.strip()]
    hashtags = " ".join(p if p.startswith("#") else f"#{p}" for p in parts)

    return {
        "firstLine": first_line,
        "body": body,
        "hashtags": hashtags,
        "bodyNarrative": body_narrative,
        "bodySpec": body_spec,
        "bodyQuestion": body_question,
    }
