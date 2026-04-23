@echo off
REM ═══════════════════════════════════════════════════════════════
REM  DEPLOY-VERCEL.bat — Deploy dashboard to Vercel
REM ═══════════════════════════════════════════════════════════════

cd /d "%~dp0the_redacted_protocol\dashboard"

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║   Deploying Dashboard to Vercel                           ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

echo [1/2] Building...
call npm run build

echo.
echo [2/2] Deploying to Vercel...
echo.
echo   If you have Vercel CLI installed:
echo     vercel --prod
echo.
echo   Otherwise, push to GitHub and Vercel will auto-deploy:
echo     cd ..
echo     git add .
echo     git commit -m "deploy to vercel"
echo     git push
echo.
echo   Then in Vercel dashboard:
echo     1. Import project
echo     2. Root directory: dashboard
echo     3. Add domain: app.redacted.bond
echo.
pause
