@echo off
cd /d "%~dp0"

:: 1. Clean port 5173 process
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do (
    if not "%%a"=="0" taskkill /F /PID %%a >nul 2>&1
)

:: 2. Start node server
start /min "ResearchHub-Backend" cmd /c "npm run dev"

:: 3. Wait for start
timeout /t 4 /nobreak >nul

:: 4. Open Browser
start "" http://127.0.0.1:5173

:: 5. Exit
exit