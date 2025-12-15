@echo off
REM SankeyMATIC Local Server with Template Storage
REM This batch file starts a local web server to run SankeyMATIC
REM Templates and settings are automatically saved in browser localStorage

echo ========================================
echo   SankeyMATIC Local Server
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
echo Templates will be saved automatically in your browser's localStorage
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

REM Start Python HTTP server in the current directory
python -m http.server 8000

REM If server stops, pause to show any error messages
pause
