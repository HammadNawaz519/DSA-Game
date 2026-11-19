# Plants vs. Zombies: Tactical Warfare - Single-Command Runner
Write-Host "====================================================================" -ForegroundColor Green
Write-Host "   PLANTS VS. ZOMBIES: TACTICAL WARFARE - ONE-CLICK RUNNER          " -ForegroundColor Yellow
Write-Host "====================================================================" -ForegroundColor Green

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Compile backend if missing
if (-not (Test-Path "$Root\backend\pvz_server.exe")) {
    Write-Host "[BUILD] Compiling C++ Backend Server..." -ForegroundColor Cyan
    $env:PATH = "C:\msys64\ucrt64\bin;$env:PATH"
    g++ -std=c++17 -static -static-libgcc -static-libstdc++ -I "$Root\backend\include" "$Root\backend\src\main.cpp" -o "$Root\backend\pvz_server.exe" -lws2_32
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Compilation failed!" -ForegroundColor Red
        Exit 1
    }
}

# 2. Check frontend dependencies
if (-not (Test-Path "$Root\frontend\node_modules")) {
    Write-Host "[SETUP] Installing frontend npm dependencies..." -ForegroundColor Cyan
    Set-Location "$Root\frontend"
    npm install
}

# 3. Start C++ Backend in a new window
Write-Host "[SERVER] Starting C++ Backend on Port 8080..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\backend'; .\pvz_server.exe"

Start-Sleep -Seconds 2

# 4. Open browser & run frontend
Start-Process "http://localhost:5173"
Write-Host "[FRONTEND] Starting Vite Game Client on port 5173..." -ForegroundColor Green
Set-Location "$Root\frontend"
npm run dev
