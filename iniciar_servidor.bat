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

for /f "tokens=14" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set "ip=%%a"
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
) else if %ip_count% equ 1 (
    set "selected_ip=!ips[1]!"
    echo Usando IP: !selected_ip!
) else (
    set /p "choice=Ingresa el numero de IP a usar (1-%ip_count%): "
    set "selected_ip=!ips[%choice%]!"
    if "!selected_ip!"=="" set "selected_ip=!ips[1]!"
)

echo.
echo ----------------------------------------------------------------

cd /d "%~dp0"

echo Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo.
    echo ERROR: Node.js no esta instalado
    echo.
    echo Descarga Node.js desde: https://nodejs.org
    echo Instala la version LTS y reinicia esta terminal
    echo.
    pause
    exit /b 1
)
echo Node.js encontrado

echo Verificando dependencias...
if not exist "node_modules" (
    echo Instalando dependencias...
    npm install
    if errorlevel 1 (
        echo ERROR al instalar dependencias
        pause
        exit /b 1
    )
)
echo Dependencias listas

echo.
echo ================================================================
echo    Iniciando EduScope LAN...
echo ================================================================
echo.
echo Puerto: %port%
echo IP: !selected_ip!
echo.
echo Acceso local: http://localhost:%port%
echo Acceso LAN:   http://!selected_ip!:%port%
echo.
echo ----------------------------------------------------------------
echo.
echo CREDENCIALES DE PRUEBA:
echo    Profesor:   profesor@demo.com / password123
echo    Estudiante: estudiante@demo.com / password123
echo.
echo Para ver el codigo QR: http://localhost:%port%/qrcode
echo.
echo Presiona Ctrl+C para detener el servidor
echo ----------------------------------------------------------------
echo.

node app.js

echo.
echo Servidor detenido.
pause
