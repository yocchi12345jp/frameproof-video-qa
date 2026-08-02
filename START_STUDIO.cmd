@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20 or later is required.
  echo Install Node.js, then run this file again.
  pause
  exit /b 1
)
node src\cli.js studio
if errorlevel 1 (
  echo.
  echo FrameProof Studio could not start. Run: node src\cli.js doctor
  pause
)
