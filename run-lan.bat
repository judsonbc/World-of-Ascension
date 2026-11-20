@echo off
rem To email password-reset codes, add: -smtp-host smtp.example.com -smtp-user you@example.com -smtp-pass APP_PASSWORD
rem Chat /commands (boss, lvl, heal ...): put YOUR account email after -admin (separate several with commas)
rem -data = the folder that holds ALL player data (accounts, levels, gear, friends, coupons). It is OUTSIDE the game files, so updating the
rem         game never touches it. Always start with the same -data. Back this folder up.
WorldOfEly.exe -lan -admin your@email.com -data "%USERPROFILE%\WorldOfAscension_data"
