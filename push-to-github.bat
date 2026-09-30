@echo off
title Jyoti Masala Box - Push to GitHub
echo ====================================================
echo   Jyoti Masala Box - 1-Click GitHub Sync
echo ====================================================
echo.
cd /d "%~dp0"
git status
echo.
git add .
set /p msg="Commit message likhein (default ke liye Enter dabayein): "
if "%msg%"=="" set msg=Update Jyoti Masala Box website files
git commit -m "%msg%"
git push origin main
echo.
echo ====================================================
echo   Code safalta-purvak GitHub par upload ho gaya!
echo ====================================================
pause
