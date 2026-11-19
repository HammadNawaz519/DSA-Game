@echo off
title Plants vs. Zombies: Tactical Warfare - Game Runner
echo ====================================================================
echo   PLANTS VS. ZOMBIES: TACTICAL WARFARE - ONE-CLICK RUNNER
echo ====================================================================
echo.

cd /d "%~dp0"

:: 1. Compile C++ backend if binary is missing
if not exist "backend\pvz_server.exe" (
    echo [BUILD] Compiling C++ Authoritative Backend Server...
    set "PATH=C:\msys64\ucrt64\bin;%PATH%"
    g++ -std=c++17 -static -static-libgcc -static-libstdc++ -I backend\include backend\src\main.cpp -o backend\pvz_server.exe -lws2_32
    if errorlevel 1 (
        echo [ERROR] Backend compilation failed! Please ensure GCC/G++ is installed.
        pause
        exit /b 1
    )
    echo [BUILD] Backend compilation succeeded!
)

:: 2. Check node_modules in frontend
if not exist "frontend\node_modules" (
    echo [SETUP] Installing frontend dependencies...
    cd frontend && npm install && cd ..
)

:: 3. Launch C++ Backend Server in separate window
echo [SERVER] Starting C++ Authoritative Backend on port 8080...
start "PvZ C++ Server (Port 8080)" cmd /k "cd /d %~dp0backend && pvz_server.exe"

:: Small delay to allow backend to bind port 8080
timeout /t 2 /nobreak >nul

:: 4. Launch Frontend Dev Server and open browser
echo [FRONTEND] Starting Vite 3D Game Client on port 5173...
start http://localhost:5173
cd /d "%~dp0frontend"
npm run dev
