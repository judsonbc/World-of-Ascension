@echo off
rem 1) web\game.js is built from the parts in web-src\client (needs Node.js; without Node the existing web\game.js is used as it is)
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js not found: using web\game.js as it is. Install Node to build it from web-src\client.
) else (
  node tools\build_client.js
  if errorlevel 1 (echo Client build failed. & pause & exit /b 1)
)
rem 2) the Go server, with everything in web\ embedded
go build -ldflags "-s -w" -o WorldOfEly.exe .
if errorlevel 1 (echo Build failed. Is Go installed? https://go.dev/dl/ & pause & exit /b 1)
echo Built WorldOfEly.exe
pause
