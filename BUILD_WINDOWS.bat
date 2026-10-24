@echo off
setlocal
cd /d "%~dp0"
if not exist node_modules (
  call npm install
  if errorlevel 1 exit /b 1
)
call npm run build
if errorlevel 1 exit /b 1
echo Build complete. Upload the dist folder to Cloudflare Pages.
pause
endlocal
