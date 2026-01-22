"""
데이터베이스 재생성 스크립트
⚠️ 주의: 모든 데이터가 삭제됩니다!
"""
from app.database.database import reset_db

if __name__ == "__main__":
    print("⚠️  데이터베이스를 재생성합니다. 모든 데이터가 삭제됩니다!")
    response = input("계속하시겠습니까? (yes/no): ")
    
    if response.lower() == "yes":
        reset_db()
        print("✅ 데이터베이스 재생성이 완료되었습니다.")
    else:
        print("❌ 취소되었습니다.")
