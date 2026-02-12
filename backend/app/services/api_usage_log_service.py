"""
API 사용 로그 서비스: 글생성/이미지생성 구분, 입출력 토큰, 비용 저장.
"""
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from app.database.models import ApiUsageLog


# gpt-4o-mini (2024~2025 기준): $0.15/1M input, $0.60/1M output
GPT4O_MINI_INPUT_PER_1M = Decimal("0.15")
GPT4O_MINI_OUTPUT_PER_1M = Decimal("0.60")

# gpt-image-1.5 (이미지 1장당 대략 가격, 공식 문서 기준 조정 가능)
GPT_IMAGE_15_PER_IMAGE_USD = Decimal("0.04")

OPERATION_POST_CREATION = "post_creation"   # 글생성
OPERATION_IMAGE_GENERATION = "image_generation"  # 이미지생성


def _compute_gpt4o_mini_cost(input_tokens: int, output_tokens: int) -> Decimal:
    """gpt-4o-mini 토큰 비용 계산 (USD)."""
    return (
        (Decimal(input_tokens) / 1_000_000) * GPT4O_MINI_INPUT_PER_1M
        + (Decimal(output_tokens) / 1_000_000) * GPT4O_MINI_OUTPUT_PER_1M
    )


def log_api_usage(
    db: Session,
    operation_type: str,
    *,
    model: Optional[str] = None,
    input_tokens: Optional[int] = None,
    output_tokens: Optional[int] = None,
    cost_usd: Optional[Decimal] = None,
    user_id: Optional[int] = None,
    extra: Optional[dict] = None,
) -> ApiUsageLog:
    """
    API 사용 로그 저장.
    - operation_type: "post_creation" | "image_generation"
    - cost_usd가 없으면 gpt-4o-mini 기준으로 input/output 토큰으로 계산.
    - 이미지 생성은 cost_usd만 넣어서 호출.
    """
    if cost_usd is None and input_tokens is not None and output_tokens is not None:
        if model and "gpt-4o-mini" in model:
            cost_usd = _compute_gpt4o_mini_cost(input_tokens, output_tokens)
        else:
            cost_usd = _compute_gpt4o_mini_cost(input_tokens, output_tokens)

    cost_str = None
    if cost_usd is not None:
        cost_str = str(round(cost_usd, 6))

    log = ApiUsageLog(
        operation_type=operation_type,
        model=model,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        cost_usd=cost_str,
        user_id=user_id,
        extra=extra,
    )
    db.add(log)
    db.flush()
    return log
