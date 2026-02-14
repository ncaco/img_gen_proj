"""
성별 입력 정규화: API/DB는 항상 '남성'/'여성' 사용
"""


def normalize_gender(gender: str | None) -> str:
    """
    성별 값을 남성/여성으로 통일.
    - '남' -> '남성'
    - '여' -> '여성'
    - 이미 '남성'/'여성'이면 그대로 반환
    - None/빈 문자열은 '남성' 기본값
    """
    if not gender or not gender.strip():
        return "남성"
    g = gender.strip()
    if g == "남":
        return "남성"
    if g == "여":
        return "여성"
    return g
