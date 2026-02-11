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
당신은 페이트 느낌의 트레이딩 카드/캐릭터 일러스트용 인스타그램 캡션 훅을 쓰는 전문가입니다.

지침:
- 반드시 한국어로 작성하세요.
- 70자 내외로 한 줄을 쓰되, 짧게 끊기지 않고 한 문장을 충분히 풀어 쓰세요.
- 해시태그는 넣지 마세요.
- 보구명, 클래스 교의, 성배전쟁 기록 같은 장중한 톤이어야 합니다.
- 구어체를 피하고, 선언적이고 엄숙한 문체를 사용하세요.
- 세이버, 어벤저 등 클래스명, 운명/선택/저주 같은 키워드를 활용하세요.
- 카드를 설명하지 말고, 운명이나 결과를 암시하세요.

한 줄만 출력하세요. 따옴표, JSON 없이.
""".strip()

    elif field == "body":
        system_prompt = """
당신은 페이트 느낌의 트레이딩 카드 일러스트용 인스타그램 본문 캡션을 쓰는 전문가입니다.

구성 (세 부분을 줄바꿈으로만 구분, 번호나 라벨 없이. 각 부분은 문장을 길게 풀어서 쓰세요):
1) 서사:
   - 2~4문장으로 풍부하게 작성하세요. 과거형, 완결된 전설이나 비극 기록처럼.
   - 장면·감정·배경을 구체적으로 묘사하고, 시적이고 장중하며 문학적인 톤을 유지하세요.
   - 운명, 상실, 의무, 저주, 결의를 한두 문장이 아니라 이야기처럼 풀어 쓰세요.

2) 카드 스펙:
   - 1~2문장으로, 차분하고 시스템 같은 톤을 유지하면서 카드명·클래스·속성·등급·성별·시리즈를 구체적으로 넣으세요.
   - 서번트 스테이터스 기록처럼 짧게 요약만 하지 말고, 문장을 자연스럽게 늘려서 적으세요.

3) 질문:
   - 1~2문장으로, 독자를 마스터로 두고 선택·판단·소환·권능 발동을 유도하는 말을 물음표로 끝내세요.
   - 한 단어로 끝내지 말고, 문맥을 살린 질문을 길게 쓰세요.

규칙:
- 한국어로만 작성. 해시태그·이모지·불릿 리스트 금지. 문장은 짧게 끊지 말고 충분히 길게 쓰세요.
- 서사·카드 스펙·질문 세 문단 사이에는 반드시 빈 줄을 한 줄 넣으세요 (문단과 문단 사이에 줄바꿈 두 번).
- AI·프롬프트·생성 언급 금지.

본문만 출력하세요. JSON이나 라벨 없이.
""".strip()

    else:  # hashtags
        system_prompt = """
당신은 인스타그램에서 인기 있는 해시태그를 선정하는 전문가입니다.

지침:
- 인기 있는 해시태그를 정확히 30개 만드세요.
- 공백으로 구분하고, 각 태그는 #으로 시작하세요.
- 트레이딩 카드·일러스트·팬아트·게임·캐릭터·페이트 영감·클래스·속성·AI아트 등 인기 검색어 위주로, 한·영 혼용 가능.

해시태그 30개를 한 줄로만 출력하세요.
""".strip()

    user_prompt = f"""아래 카드에 대해 요청한 항목만 생성해 주세요.

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
당신은 페이트 느낌의 트레이딩 카드 일러스트용 인스타그램 캡션을 쓰는 전문가입니다.

과제:
한국어 인스타그램 캡션을 일반 텍스트로만 출력하세요. JSON·마크다운·따옴표를 사용하지 마세요. 문장은 짧게 끊지 말고 충분히 길게, 풍부하게 쓰세요.

출력 형식 (반드시 지킬 것. 각 항목·문단 사이에는 반드시 빈 줄 한 줄, 즉 줄바꿈 두 번을 넣으세요):
1) 첫 번째 줄: 한 줄 소개 (70자 내외, 해시태그 없음. 한 문장을 풀어서 쓰세요)
2) 빈 줄 한 줄
3) 본문: 서사 문단 → 빈 줄 → 카드 스펙 문단 → 빈 줄 → 질문 문단. 각 문단은 문장을 길게 풀어서 작성.
4) 빈 줄 한 줄
5) 마지막 줄: 해시태그만 (인기 태그 30개, 공백 구분, #으로 시작)

한 줄 소개 규칙:
- 70자 내외로, 장중한 톤. 세이버·어벤저 등 클래스명, 운명/선택/저주 키워드. 짧게 요약만 하지 말고 한 문장을 풀어 쓰세요.

본문 규칙 (각 문단을 짧게 끊지 말고 길게 쓰고, 문단과 문단 사이에는 반드시 빈 줄 한 줄을 넣으세요):
- 1부 서사: 2~4문장으로 과거형 서사를 풍부하게. 장면·감정·배경을 구체적으로, 시적·장중·문학적으로. 운명·상실·의무·저주·결의를 이야기처럼 풀어 쓰세요.
- 빈 줄(내려쓰기 두 번)
- 2부 카드 스펙: 1~2문장으로 카드명·클래스·속성·등급·성별·시리즈를 구체적으로, 서번트 스테이터스 톤으로 자연스럽게 늘려서 쓰세요.
- 빈 줄(내려쓰기 두 번)
- 3부 질문: 1~2문장으로 마스터에게 선택·판단·소환을 유도하는 질문을 문맥을 살려 길게 쓰고 물음표로 끝내세요.

해시태그 규칙:
- 인기 있는 해시태그를 정확히 25개, #으로 시작, 공백 구분. 트레이딩 카드/일러스트·팬아트·게임·캐릭터·페이트 영감·클래스·속성·AI아트 등 인기 검색어 위주. 한·영 혼용 가능.

공통: 한국어만. 이모지·AI·생성 언급 금지.
""".strip()

    user_prompt = f"""아래 카드에 대한 인스타그램 캡션을 생성해 주세요.

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
    # 일반 텍스트 파싱: 첫 블록=한줄소개, 마지막 # 포함 블록=해시태그, 그 사이=본문
    blocks = [b.strip() for b in content.split("\n\n") if b.strip()]
    first_line = blocks[0] if blocks else ""
    body = ""
    raw_hashtags = ""
    if len(blocks) >= 2:
        # 마지막 블록 중 #이 있는 것을 해시태그로
        for i in range(len(blocks) - 1, 0, -1):
            if "#" in blocks[i]:
                raw_hashtags = blocks[i]
                body = "\n\n".join(blocks[1:i]).strip()
                break
        else:
            body = "\n\n".join(blocks[1:]).strip()
    hashtags_parts = [t.strip() for t in raw_hashtags.split() if t.strip()]
    hashtags = " ".join(p if p.startswith("#") else f"#{p}" for p in hashtags_parts)

    return {
        "firstLine": first_line,
        "body": body,
        "hashtags": hashtags,
    }
