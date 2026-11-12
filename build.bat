@echo off
go build -ldflags "-s -w" -o WorldOfEly.exe .
if errorlevel 1 (echo Build failed. Is Go installed? https://go.dev/dl/ & pause & exit /b 1)
echo Built WorldOfEly.exe
pause
