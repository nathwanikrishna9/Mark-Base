@echo off
echo ====================================
echo   MARKBASE - FULL STACK STARTUP
echo ====================================
echo.
echo Starting Backend (Port 8000)...
start "MarkBase Backend" cmd /k "cd /d D:\FinalYearProject\Mark-Base\backend && python run.py"

timeout /t 3 /nobreak > nul

echo Starting Frontend (Port 3000)...
start "MarkBase Frontend" cmd /k "cd /d D:\FinalYearProject\Mark-Base\frontend && npm run dev"

echo.
echo ====================================
echo   Both servers are starting...
echo.
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:3000
echo   API Docs: http://localhost:8000/docs
echo ====================================
echo.
echo Close this window when done.
pause
