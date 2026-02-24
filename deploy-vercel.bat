@echo off
echo ========================================
echo   Deploying to Vercel
echo ========================================
echo.

echo Step 1: Checking Vercel login...
vercel whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo You need to login to Vercel first.
    echo Opening browser for authentication...
    vercel login
)

echo.
echo Step 2: Deploying to production...
vercel --prod

echo.
echo ========================================
echo   Deployment Complete!
echo ========================================
echo.
echo Don't forget to add environment variables in Vercel dashboard:
echo - JWT_SECRET
echo - NODE_ENV=production
echo - NEXT_PUBLIC_APP_URL
echo.
pause
