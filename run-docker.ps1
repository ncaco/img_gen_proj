# Docker Compose 실행 스크립트 (프론트엔드 + 백엔드)
param(
    [switch]$Detached  # -Detached 면 백그라운드 실행 (docker compose up -d)
)

Write-Host "🐳 Docker Compose 시작 중..." -ForegroundColor Green

Set-Location -Path $PSScriptRoot

$composeFile = "docker/docker-compose.yml"
if (-not (Test-Path $composeFile)) {
    Write-Host "❌ $composeFile 을 찾을 수 없습니다." -ForegroundColor Red
    exit 1
}

Write-Host "📍 프로젝트 루트: $(Get-Location)" -ForegroundColor Cyan
Write-Host "🔧 docker compose up 실행 (종료: Ctrl+C)" -ForegroundColor Yellow
Write-Host "   백그라운드 실행 시: pwsh run-docker.ps1 -Detached" -ForegroundColor Gray
Write-Host ""

if ($Detached) {
    docker compose -f $composeFile up -d
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ 컨테이너가 백그라운드에서 실행 중입니다." -ForegroundColor Green
        Write-Host "   프론트엔드: http://localhost:3000" -ForegroundColor Cyan
        Write-Host "   백엔드 API: http://localhost:8000" -ForegroundColor Cyan
        Write-Host "   중지: docker compose -f $composeFile down" -ForegroundColor Gray
    }
} else {
    docker compose -f $composeFile up
}
