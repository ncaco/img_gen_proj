"""
OpenAI Image Edit 서비스 (images.edit API)
카드 미리보기 이미지 + 프롬프트로 이미지 편집 생성.
"""
import io

from openai import OpenAI

from app.core.config import settings


def run_image_edit(image_bytes: bytes, prompt: str) -> str:
    """
    OpenAI images.edit API로 이미지 생성.
    - image_bytes: 참조 이미지 바이트 (jpg/png/webp 등)
    - prompt: 편집/생성 지시 프롬프트
    - 반환: 생성된 이미지 base64 문자열 (data URL prefix 없음)
    """
    if not settings.OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY가 설정되지 않았습니다.")

    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    # BytesIO로 감싸고 파일 이름을 지정해서 mimetype 추론을 도와줌
    image_file = io.BytesIO(image_bytes)
    image_file.name = "image.png"

    # Pillow가 설치되어 있으면 PNG로 한 번 변환해서 보냄 (선택적)
    try:
        from PIL import Image  # type: ignore

        original = Image.open(io.BytesIO(image_bytes))
        converted = original.convert("RGBA")
        buf = io.BytesIO()
        converted.save(buf, format="PNG")
        buf.seek(0)
        buf.name = "image.png"
        image_file = buf
    except Exception:
        # Pillow 미설치 또는 변환 실패 시, 원본 바이트를 그대로 사용
        pass

    result = client.images.edit(
        model="gpt-image-1.5",
        image=image_file,
        prompt=prompt.strip(),
        output_format="png",
        size="1024x1536",
        quality="high",
        input_fidelity="high",
    )

    if not result.data or len(result.data) == 0:
        raise ValueError("이미지 생성 결과가 없습니다.")

    image_base64 = result.data[0].b64_json
    if not image_base64:
        raise ValueError("이미지 base64 데이터가 없습니다.")

    return image_base64
