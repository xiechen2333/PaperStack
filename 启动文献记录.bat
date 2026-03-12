@echo off
cd /d D:\Software\PaperManegement\research-hub

:: 1. 清理旧进程
taskkill /F /IM node.exe >nul 2>&1

:: 2. 最小化启动 (注意：这里不要变)
start /min "ResearchHub后台" npm run dev

:: 3. 等待时间可以缩短一点，因为我们直接用 IP 了
timeout /t 4 /nobreak >nul

:: 4. 【核心修改】把 localhost 改为 127.0.0.1
start "" http://127.0.0.1:5173

:: 5. 退出
exit