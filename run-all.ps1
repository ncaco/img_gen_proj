# 백엔드와 프론트엔드를 동시에 실행하는 스크립트
Write-Host "🚀 전체 서버 시작 중..." -ForegroundColor Green

# 프로젝트 루트 디렉토리
$rootDir = $PSScriptRoot

# 백엔드 서버를 백그라운드로 실행
Write-Host "📦 백엔드 서버 시작..." -ForegroundColor Cyan
$backendJob = Start-Job -ScriptBlock {
    Set-Location -Path $using:rootDir\backend
    uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
}

# 잠시 대기
Start-Sleep -Seconds 2

# 프론트엔드 서버 실행 (포그라운드)
Write-Host "🎨 프론트엔드 서버 시작..." -ForegroundColor Cyan
Set-Location -Path "$rootDir\frontend"
npm run dev

# 스크립트 종료 시 백엔드 작업도 종료
Write-Host "`n🛑 서버 종료 중..." -ForegroundColor Yellow
Stop-Job -Job $backendJob
Remove-Job -Job $backendJob
