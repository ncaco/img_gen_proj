# 백엔드 서버 실행 스크립트
Write-Host "🚀 백엔드 서버 시작 중..." -ForegroundColor Green

# 백엔드 디렉토리로 이동
Set-Location -Path "$PSScriptRoot\backend"

# 서버 실행
Write-Host "📍 작업 디렉토리: $(Get-Location)" -ForegroundColor Cyan
Write-Host "🔧 서버 실행 중..." -ForegroundColor Yellow

uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
