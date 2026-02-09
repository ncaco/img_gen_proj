"""
OpenAI Image Edit 서비스 (images.edit API)
카드 미리보기 이미지 + 프롬프트로 이미지 편집 생성.
"""
import base64
import io
from openai import OpenAI

from app.core.config import settings


def run_image_edit(image_bytes: bytes, prompt: str) -> str:
    """
    OpenAI images.edit API로 이미지 생성.
    - image_bytes: 참조 이미지 바이트 (PNG 등)
    - prompt: 편집/생성 지시 프롬프트
    - 반환: 생성된 이미지 base64 문자열 (data URL prefix 없음)
    """
    if not settings.OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY가 설정되지 않았습니다.")

    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    # file-like 객체로 전달 (노트북 img_gen_latest.ipynb 참고)
    image_file = io.BytesIO(image_bytes)

    result = client.images.edit(
        model="chatgpt-image-latest",
        image=[image_file],
        prompt=prompt.strip(),
        output_format="png",
        size="1024x1536",
    )

    if not result.data or len(result.data) == 0:
        raise ValueError("이미지 생성 결과가 없습니다.")

    image_base64 = result.data[0].b64_json
    if not image_base64:
        raise ValueError("이미지 base64 데이터가 없습니다.")

    return image_base64
