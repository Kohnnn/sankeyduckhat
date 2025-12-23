@echo off
REM SankeyMATIC Local Development Server
REM React + Vite application

echo ========================================
echo   SankeyMATIC Development Server
echo   React + Vite
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    echo.
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
)

echo Starting Vite development server...
echo.
echo SankeyMATIC will be available at:
echo   http://localhost:5173/
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

REM Start Vite dev server
npm run dev

REM If server stops, pause to show any error messages
pause
