# Build and Deploy Angular App to Server
# This script builds the Angular client and copies it to the NigredoServer public folder

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Building Albedo Client for Twitch Widgets" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Navigate to AlbedoClient directory and always return to root after build
Push-Location ".\AlbedoClient"

try {
    # Check if node_modules exists
    if (-not (Test-Path "node_modules")) {
        Write-Host "Installing dependencies..." -ForegroundColor Yellow
        npm install
    }

    # Run production build
    Write-Host "`nBuilding production bundle..." -ForegroundColor Yellow
    npm run build:prod
}
finally {
    Pop-Location
}

# Check if build was successful
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n================================================" -ForegroundColor Green
    Write-Host "Build successful!" -ForegroundColor Green
    Write-Host "Output copied to: ..\NigredoServer\public" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n================================================" -ForegroundColor Red
    Write-Host "Build failed! Exit code: $LASTEXITCODE" -ForegroundColor Red
    Write-Host "================================================" -ForegroundColor Red
    exit 1
}
