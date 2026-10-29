@echo off
echo ========================================================
echo Starting Multimodal AI Chatbot MVP...
echo ========================================================

set "PATH=C:\Program Files\nodejs;%PATH%"

echo Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "Multimodal AI Backend" cmd /k "cd backend && venv\Scripts\activate && uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 2 /nobreak >nul

echo Starting Vite React Frontend on http://127.0.0.1:5173 ...
start "Multimodal AI Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================================
echo Application is starting!
echo Frontend: http://127.0.0.1:5173/
echo Backend Docs: http://127.0.0.1:8000/docs
echo ========================================================
