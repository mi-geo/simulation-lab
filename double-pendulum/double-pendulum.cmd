@echo off
setlocal

cd /d "%~dp0"

echo Starting Double Pendulum Lab on http://localhost:5173/
echo.
echo Keep this window open while the app is running.
echo Press Ctrl+C in this window to stop the server.
echo.

npm.cmd run dev -- --host localhost --port 5173

if errorlevel 1 (
  echo.
  echo The launcher hit an error.
  pause
)
