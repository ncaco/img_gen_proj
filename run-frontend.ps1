# 프론트엔드 개발 서버 실행 스크립트
Write-Host "🚀 프론트엔드 서버 시작 중..." -ForegroundColor Green

# 프론트엔드 디렉토리로 이동
Set-Location -Path "$PSScriptRoot\frontend"

# 서버 실행
Write-Host "📍 작업 디렉토리: $(Get-Location)" -ForegroundColor Cyan
Write-Host "🔧 개발 서버 실행 중..." -ForegroundColor Yellow

npm run dev
