@echo off
REM SankeyMATIC Local Server with AI Integration
REM This batch file starts a local web server to run SankeyMATIC
REM Features: AI-powered data parsing, Data Editor, Template Storage

echo ========================================
echo   SankeyMATIC Local Server
echo   with AI Integration
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

echo Starting local web server...
echo.
echo SankeyMATIC will be available at:
echo   http://localhost:8000/build/
echo.
echo Features:
echo   - Text Input and Data Editor tabs
echo   - AI-powered financial data parsing
echo   - Flow validation and balance checking
echo   - Template storage in browser localStorage
echo.
echo Opening browser...
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

REM Open browser after a short delay
start "" "http://localhost:8000/build/"

REM Start Python HTTP server in the current directory
python -m http.server 8000

REM If server stops, pause to show any error messages
pause
