"""
클래스(2뎁스) 카테고리 시드 데이터 입력

구성:
  1. 일반: 세이버, 랜서, 아처, 라이더, 캐스터, 어새신, 버서커
  2. 엑스트라: 룰러, 어벤저, 실더, 거너, 얼터에고, 문캔서, 포리너, 프리텐더, 세이비어, 페이커, 워처, 보이저, 게이트키퍼, 퍼니 뱀프
  3. 비서번트: 헤븐즈 홀, 비스트, 에인션트 자이언트, 에인션트 갓

사용법:
  uv run python seed_class_categories.py
"""
from app.database.database import SessionLocal, init_db
from app.database.models import Category, CategoryType


# 클래스 2뎁스 목록 (순서대로 sort_order 0, 1, 2, ...)
CLASS_NAMES = [
    # 1. 일반
    "세이버",
    "랜서",
    "아처",
    "라이더",
    "캐스터",
    "어새신",
    "버서커",
    # 2. 엑스트라
    "룰러",
    "어벤저",
    "실더",
    "거너",
    "얼터에고",
    "문캔서",
    "포리너",
    "프리텐더",
    "세이비어",
    "페이커",
    "워처",
    "보이저",
    "게이트키퍼",
    "퍼니 뱀프",
    # 3. 비서번트
    "헤븐즈 홀",
    "비스트",
    "에인션트 자이언트",
    "에인션트 갓",
]

TYPE_KEY_CLASS = "class"


def main() -> None:
    init_db(force_recreate=False)

    db = SessionLocal()
    try:
        type_row = db.query(CategoryType).filter(CategoryType.type_key == TYPE_KEY_CLASS).first()
        if not type_row:
            print("❌ category_types에 'class'(클래스) 타입이 없습니다. 서버를 한 번 실행해 시드 후 다시 실행하세요.")
            return

        type_id = type_row.id
        existing = {c.name for c in db.query(Category).filter(Category.type_id == type_id).all()}

        added = 0
        for sort_order, name in enumerate(CLASS_NAMES):
            if name in existing:
                continue
            c = Category(
                type_id=type_id,
                type=TYPE_KEY_CLASS,
                name=name,
                sort_order=sort_order,
                is_used=1,
            )
            db.add(c)
            added += 1

        db.commit()
        print(f"✅ 클래스(2뎁스) 시드 완료: 신규 {added}건 추가 (총 {len(CLASS_NAMES)}건 중 기존 {len(existing)}건 제외)")
    finally:
        db.close()


if __name__ == "__main__":
    main()
