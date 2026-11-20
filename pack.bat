@echo off
rem Makes WorldOfAscension_update.zip from THIS folder WITHOUT any player data, so uploading it can never overwrite accounts / levels / gear.
if exist WorldOfAscension_update.zip del WorldOfAscension_update.zip
tar -a -c -f WorldOfAscension_update.zip --exclude=data --exclude=users.json --exclude=users.json.bak --exclude=users.json.tmp --exclude=secret.key --exclude=coupons.json --exclude=friends.json --exclude=whispers.json --exclude=*.zip --exclude=*.exe .
if errorlevel 1 (echo tar failed. Needs Windows 10 or newer. & pause & exit /b 1)
echo Made WorldOfAscension_update.zip (no player data inside, no exe: run build.bat on the server).
pause
