@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Please install Node.js 22 from https://nodejs.org/
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing project dependencies...
  call npm install
  if errorlevel 1 (
    echo npm install failed. Please check your internet connection.
    pause
    exit /b 1
  )
)
echo Starting TECHNICA LMS Demo at http://localhost:5173
call npm run dev
endlocal
