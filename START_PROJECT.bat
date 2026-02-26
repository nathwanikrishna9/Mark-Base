@echo off
echo Starting Mark-Base Project...
echo.
echo Starting Backend Server...
start "Mark-Base Backend" cmd /k "cd /d D:\FinalYearProject\Mark-Base\backend && call venv\Scripts\activate.bat && python run.py"
timeout /t 3 /nobreak >nul
echo Starting Frontend Server...
start "Mark-Base Frontend" cmd /k "cd /d D:\FinalYearProject\Mark-Base\frontend && npm run dev"
echo.
echo Both servers are starting!
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo.
pause
