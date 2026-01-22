"""
데이터베이스 상태 확인 스크립트
"""
import sqlite3
from pathlib import Path
from app.core.config import settings

def check_database():
    """데이터베이스 파일 상태 확인"""
    db_path = settings.database_path / settings.DATABASE_NAME
    
    print(f"📁 데이터베이스 경로: {db_path}")
    print(f"📊 파일 존재 여부: {db_path.exists()}")
    
    if not db_path.exists():
        print("❌ 데이터베이스 파일이 존재하지 않습니다.")
        print("💡 서버를 실행하면 자동으로 생성됩니다.")
        return
    
    # 파일 크기 확인
    file_size = db_path.stat().st_size
    print(f"📏 파일 크기: {file_size} bytes")
    
    if file_size == 0:
        print("⚠️  데이터베이스 파일이 비어있습니다. 재생성이 필요합니다.")
        return
    
    # SQLite 연결 테스트
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # 테이블 목록 조회
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = cursor.fetchall()
        
        print(f"\n📋 테이블 목록 ({len(tables)}개):")
        for table in tables:
            print(f"  - {table[0]}")
            
            # 각 테이블의 컬럼 정보
            cursor.execute(f"PRAGMA table_info({table[0]})")
            columns = cursor.fetchall()
            print(f"    컬럼:")
            for col in columns:
                pk_marker = " (PK)" if col[5] else ""
                print(f"      - {col[1]} ({col[2]}){pk_marker}")
        
        # cards 테이블이 있으면 데이터 개수 확인
        if any('cards' in str(t) for t in tables):
            cursor.execute("SELECT COUNT(*) FROM cards")
            count = cursor.fetchone()[0]
            print(f"\n📊 cards 테이블 데이터 개수: {count}")
            
            # card_number 컬럼 확인
            cursor.execute("PRAGMA table_info(cards)")
            columns = cursor.fetchall()
            has_card_number = any(col[1] == 'card_number' for col in columns)
            has_id = any(col[1] == 'id' for col in columns)
            
            print(f"  - card_number 컬럼 존재: {has_card_number}")
            print(f"  - id 컬럼 존재: {has_id}")
            
            if has_id and not has_card_number:
                print("  ⚠️  구 스키마입니다. 테이블 재생성이 필요합니다.")
        
        conn.close()
        print("\n✅ 데이터베이스 파일이 정상입니다.")
        
    except sqlite3.Error as e:
        print(f"\n❌ 데이터베이스 오류: {e}")
        print("💡 데이터베이스 파일이 손상되었을 수 있습니다. 재생성이 필요합니다.")

if __name__ == "__main__":
    check_database()
