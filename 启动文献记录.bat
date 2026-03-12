@echo off
cd /d "%~dp0"

:: 1. 清理占用 5173 端口的进程，避免误杀所有 node.exe
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do (
    if not "%%a"=="0" taskkill /F /PID %%a >nul 2>&1
)

:: 2. 最小化启动后台
start /min "ResearchHub后台" npm run dev

:: 3. 等待启动
timeout /t 3 /nobreak >nul

:: 4. 打开浏览器访问
start "" http://127.0.0.1:5173

:: 5. 退出终端
exit