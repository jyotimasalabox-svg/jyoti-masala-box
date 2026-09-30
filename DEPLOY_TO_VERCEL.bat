@echo off
title Deploy Jyoti Masala Box to Vercel
cd /d "%~dp0"
set "NODE_DIR=C:\Users\91637\AppData\Local\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.19.0-win-x64"
set "PATH=%NODE_DIR%;%PATH%"

echo ==========================================================
echo    JYOTI MASALA BOX - 1-CLICK VERCEL DEPLOYMENT
echo ==========================================================
echo.
echo Step 1: Deploying Jyoti Masala Box directly to Production...
call vercel --prod --yes
echo.
echo ==========================================================
echo  Deployment complete! Your website is live worldwide!
echo ==========================================================
pause
