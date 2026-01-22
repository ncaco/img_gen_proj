"""
데이터베이스 쿼리 실행 스크립트
사용법: uv run python query_db.py "SELECT * FROM cards"
"""
import sqlite3
import sys
from app.core.config import settings

def execute_query(query: str):
    """SQL 쿼리 실행"""
    db_path = settings.database_path / settings.DATABASE_NAME
    
    if not db_path.exists():
        print("❌ 데이터베이스 파일이 존재하지 않습니다.")
        return
    
    try:
        conn = sqlite3.connect(str(db_path))
        conn.row_factory = sqlite3.Row  # 딕셔너리 형태로 결과 반환
        cursor = conn.cursor()
        
        cursor.execute(query)
        
        # SELECT 쿼리인 경우 결과 출력
        if query.strip().upper().startswith('SELECT'):
            rows = cursor.fetchall()
            if rows:
                # 컬럼명 출력
                columns = [description[0] for description in cursor.description]
                print(" | ".join(columns))
                print("-" * 80)
                
                # 데이터 출력
                for row in rows:
                    print(" | ".join(str(value) if value is not None else "NULL" for value in row))
                print(f"\n총 {len(rows)}개 행")
            else:
                print("결과가 없습니다.")
        else:
            conn.commit()
            print(f"✅ 쿼리가 실행되었습니다. 영향받은 행: {cursor.rowcount}")
        
        conn.close()
        
    except sqlite3.Error as e:
        print(f"❌ 오류: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("사용법: uv run python query_db.py \"SELECT * FROM cards\"")
        print("\n예제:")
        print("  uv run python query_db.py \"SELECT * FROM cards\"")
        print("  uv run python query_db.py \"SELECT card_number, card_name, type FROM cards\"")
        print("  uv run python query_db.py \"SELECT COUNT(*) FROM cards\"")
    else:
        query = sys.argv[1]
        execute_query(query)
