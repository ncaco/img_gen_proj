# 데이터베이스 조회 스크립트
Write-Host "📊 데이터베이스 조회" -ForegroundColor Green
Write-Host ""

# Python 스크립트 실행
uv run python check_db.py

Write-Host ""
Write-Host "💡 SQL 쿼리를 실행하려면:" -ForegroundColor Cyan
Write-Host "   uv run python -c `"import sqlite3; conn = sqlite3.connect('data/database/cards.db'); cursor = conn.cursor(); cursor.execute('SELECT * FROM cards'); print(cursor.fetchall())`"" -ForegroundColor Yellow
