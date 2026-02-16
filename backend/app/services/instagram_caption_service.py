"""
인스타그램 캡션(한 줄 소개, 본문, 해시태그) AI 생성 서비스
"""
from typing import Literal
from openai import AsyncOpenAI

from app.core.config import settings

CaptionField = Literal["firstLine", "body", "hashtags"]

# 하드코딩 해시태그 (AI 생성 없이 캡션 하단에 항상 추가, 한 줄씩 리스트)
DEFAULT_HASHTAGS = [
    "#digitalart",
    "#art",
    "#artist",
    "#aiartengagement",
    "#artwork",
    "#digitaldrawing",
    "#aiartgallery",
    "#gptart",
    "#chatgptart",
    "#gptgenerated",
    "#aiillustration",
    "#aiartists",
    "#artoftheday",
    "#aiartcommunity",
    "#aiartwork",
    "#animeart",
    "#digitalillustration",
    "#characterdesign",
    "#graphicdesign",
    "#fantasyart",
    "#illustration",
    "#generativeaiart",
    "#gptdesign",
    "#promptart",
    "#aiworkflow",
    "#anime",
    "#tcgart",
    "#cardillustration",
    "#fantasycard",
    "#aicreative",
]


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
    field: "firstLine" | "body" | "hashtags" (hashtags는 하드코딩으로 반환)
    Returns: 생성된 문자열
    """
    if field == "hashtags":
        return " ".join(DEFAULT_HASHTAGS), None

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

    else:  # body
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

    user_prompt = f"""아래 카드에 대해 요청한 항목만 생성해 주세요.

{card_info}
"""

    response = await client.chat.completions.create(
        model="gpt-5-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )
    content = (response.choices[0].message.content or "").strip()
    usage = None
    if getattr(response, "usage", None):
        u = response.usage
        inp = getattr(u, "input_tokens", None) or getattr(u, "prompt_tokens", None)
        out = getattr(u, "output_tokens", None) or getattr(u, "completion_tokens", None)
        if inp is not None and out is not None:
            usage = {"input_tokens": inp, "output_tokens": out}
    return content, usage


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
역할:
당신은 게임 캐릭터 인스타그램 홍보 카피라이터입니다.

목표:
- 캐릭터 카드 홍보용 SNS 캡션을 작성합니다.
- 문학 작품 같은 설명문이 아니라, **마케팅용 소개문**을 작성합니다.

출력 규칙:
- 반드시 아래 [출력 스키마] 형식을 그대로 사용합니다.
- 형식의 순서, 줄바꿈, 표기(콜론 등)를 절대 변경하지 마세요.
- 추가 문장, 설명, 기호를 절대 넣지 마세요.
- 출력은 **일반 텍스트**만 사용합니다.
  (마크다운, JSON, 따옴표, 번호, 이모지 사용 금지)
- 언어는 반드시 한국어로 작성합니다.

[출력 스키마]

서사 도입 단락 (1~2문장)

<빈 줄>

캐릭터 배경과 감정 설명 (2~3문장)

<빈 줄>

전투 방식과 능력 묘사 (2~3문장)

<빈 줄>

성별 : {성별}
속성 : {속성}
클래스 : {클래스}
등급 : {등급}
시리즈 : {시리즈}

<빈 줄>

마스터에게 묻는 문장 (1~2문장)

(해시태그는 별도로 추가되므로 출력하지 마세요.)

스타일 가이드:
- 장엄하고 신화적인 톤.
- 마케팅 카피처럼 리듬감 있는 문장.
- 각 단락은 1~3문장 정도로 짧게 구성해 SNS 가독성을 높일 것.
- 설명문처럼 쓰지 말고, **소개문**처럼 캐릭터를 매력적으로 보이게 작성할 것.
""".strip()

    user_prompt = f"""아래 카드 정보를 사용하여 인스타그램 홍보 캡션을 생성하세요.

{card_info}"""

    response = await client.chat.completions.create(
        model="gpt-5-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )
    content = (response.choices[0].message.content or "").strip()
    usage = None
    if getattr(response, "usage", None):
        u = response.usage
        inp = getattr(u, "input_tokens", None) or getattr(u, "prompt_tokens", None)
        out = getattr(u, "output_tokens", None) or getattr(u, "completion_tokens", None)
        if inp is not None and out is not None:
            usage = {"input_tokens": inp, "output_tokens": out}
    # 일반 텍스트 파싱: 첫 블록=한줄소개, 나머지=본문 (해시태그는 하드코딩 사용)
    blocks = [b.strip() for b in content.split("\n\n") if b.strip()]
    first_line = blocks[0] if blocks else ""
    body = "\n\n".join(blocks[1:]).strip() if len(blocks) >= 2 else ""

    return {
        "firstLine": first_line,
        "body": body,
        "hashtags": " ".join(DEFAULT_HASHTAGS),
    }, usage
