@echo off
title EduScope LAN - Servidor
color 0A

echo.
echo ================================================================
echo    EduScope LAN - Iniciando Servidor
echo ================================================================
echo.

setlocal EnableDelayedExpansion

set "ip_count=0"

echo Detectando direcciones IP disponibles...
echo.

REM Buscar IPs en espanol e ingles
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set "ip=%%a"
    set "ip=!ip: =!"
    if not "!ip!"=="" (
        set /a "ip_count+=1"
        set "ips[!ip_count!]=!ip!"
        echo   [!ip_count!] !ip!
    )
)

echo.

set "port=3000"

if %ip_count% equ 0 (
    echo No se detectaron IPs. Usando 0.0.0.0
    set "selected_ip=0.0.0.0"
    goto :continue
)

if %ip_count% equ 1 (
    set "selected_ip=!ips[1]!"
    echo Usando unica IP detectada: !selected_ip!
    goto :continue
)

echo.
echo multiple IPs detected, please select one:
echo.

set /p "choice=Enter the IP number to use (1-%ip_count%): "

REM Validate input
if "!choice!"=="" set "choice=1"
if %choice% gtr %ip_count% set "choice=1"
if %choice% lss 1 set "choice=1"

set "selected_ip=!ips[%choice%]!"
echo Selected IP: !selected_ip!

:continue
echo.
echo ----------------------------------------------------------------

cd /d "%~dp0"

echo Verifying Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo.
    echo ERROR: Node.js is not installed
    echo.
    echo Download Node.js from: https://nodejs.org
    echo Install the LTS version and restart this terminal
    echo.
    pause
    exit /b 1
)
echo Node.js found

echo Verifying dependencies...
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if errorlevel 1 (
        echo ERROR installing dependencies
        pause
        exit /b 1
    )
)
echo Dependencies ready

echo.
echo ================================================================
echo    Starting EduScope LAN...
echo ================================================================
echo.
echo Port: %port%
echo IP: !selected_ip!
echo.
echo Local access: http://localhost:%port%
echo LAN access:   http://!selected_ip!:%port%
echo.
echo ----------------------------------------------------------------
echo.
echo Test credentials:
echo    Professor:   profesor@demo.com / password123
echo    Student:     estudiante@demo.com / password123
echo.
echo To view QR code: http://localhost:%port%/qrcode
echo.
echo Press Ctrl+C to stop the server
echo ----------------------------------------------------------------
echo.

REM Launch Node.js with the selected IP as a command-line argument
node app.js --ip=!selected_ip!

echo.
echo Server stopped.
pause
