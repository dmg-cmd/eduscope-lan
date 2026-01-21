@echo off
chcp 65001 >nul
title EduScope LAN - Servidor de Gestion Academica
color 0A

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║   🏫 EduScope LAN - Iniciando Servidor                       ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM ============================================
REM Detectar direcciones IP disponibles
REM ============================================
echo 📡 Detectando direcciones IP disponibles...
echo.

setlocal EnableDelayedExpansion

set "ip_count=0"
set "ips[0]=127.0.0.1"

REM Obtener IPs usando ipconfig
for /f "tokens=14" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set "ip=%%a"
    if not "!ip!"=="" (
        set /a "ip_count+=1"
        set "ips[!ip_count!]=!ip!"
        echo   [!ip_count!] !ip!
    )
)

echo.
echo ───────────────────────────────────────────────────────────────
echo.

REM Puerto
set "port=3000"

REM Si solo hay una IP (localhost), agregar opciones adicionales
if %ip_count% equ 1 (
    echo ℹ️  Solo se detecto localhost. Estas son las opciones disponibles:
    echo.
    echo   [1] 127.0.0.1 (Solo acceso local)
    echo   [2] 0.0.0.0 (Todas las interfaces - recomendado para LAN)
    echo.
    set /p "choice=👉 Ingresa el numero de IP a usar (1-2): "
    
    if "!choice!"=="1" (
        set "selected_ip=127.0.0.1"
    ) else if "!choice!"=="2" (
        set "selected_ip=0.0.0.0"
    ) else (
        echo ⚠️  Opcion invalida, usando 0.0.0.0 por defecto
        set "selected_ip=0.0.0.0"
    )
) else (
    if %ip_count% gtr 1 (
        set /p "choice=👉 Ingresa el numero de IP a usar (1-%ip_count%): "
        
        if defined ips[%choice%] (
            set "selected_ip=!ips[%choice%]!"
        ) else (
            echo ⚠️  Opcion invalida, usando la primera IP detectada
            set "selected_ip=!ips[1]!"
        )
    )
)

echo.
echo ───────────────────────────────────────────────────────────────
echo.

REM Cambiar al directorio del proyecto
cd /d "%~dp0"

REM Verificar si Node.js esta instalado
echo 🔍 Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo.
    echo ❌ ERROR: Node.js no esta instalado o no esta en el PATH
    echo.
    echo 📦 Para usar EduScope LAN, necesitas instalar Node.js:
    echo    1. Descarga Node.js desde: https://nodejs.org
    echo    2. Instala la version LTS (18 o superior)
    echo    3. Reinicia esta terminal
    echo.
    pause
    exit /b 1
)
echo   ✅ Node.js encontrado

REM Verificar dependencias
echo 📦 Verificando dependencias...
if not exist "node_modules" (
    echo   ⚠️  Instalando dependencias...
    npm install >nul 2>&1
    if errorlevel 1 (
        color 0C
        echo.
        echo ❌ ERROR al instalar dependencias
        pause
        exit /b 1
    )
) else (
    REM Verificar si qrcode esta instalado
    npm list qrcode >nul 2>&1
    if errorlevel 1 (
        echo   📦 Instalando paquete QRCode...
        npm install qrcode --save >nul 2>&1
        if errorlevel 1 (
            echo   ⚠️  No se pudo instalar QRCode, pero el servidor funcionara
        ) else (
            echo   ✅ QRCode instalado
        )
    ) else (
        echo   ✅ Dependencias listas
    )
)

echo.
echo ───────────────────────────────────────────────────────────────
echo.
echo 🔧 Puerto configurado: %port%
echo.

echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║   🚀 Iniciando EduScope LAN...                               ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM Calcular URL de acceso
if "!selected_ip!"=="0.0.0.0" (
    set "local_url=http://localhost:%port%"
    set "lan_url=http://[IP-DE-ESTA-MAQUINA]:%port%"
) else if "!selected_ip!"=="127.0.0.1" (
    set "local_url=http://localhost:%port%"
    set "lan_url=No disponible (solo acceso local)"
) else (
    set "local_url=http://localhost:%port%"
    set "lan_url=http://!selected_ip!:%port%"
)

echo 📡 Acceso desde esta computadora: %local_url%
echo 📡 Acceso desde la red local:      %lan_url%
echo.

REM Preguntar si quiere ver el codigo QR
echo ───────────────────────────────────────────────────────────────
echo.
echo 📱 CODIGO QR PARA ESTUDIANTES
echo    Los estudiantes pueden escanear este codigo para acceder rapidamente
echo    al servidor desde sus dispositivos moviles.
echo.
echo   [1] Abrir codigo QR en el navegador (recomendado)
echo   [2] No abrir codigo QR
echo.
set /p "qr_choice=👉 Elige una opcion (1-2): "

if "!qr_choice!"=="1" (
    echo.
    echo ⏳ El codigo QR se generara cuando el servidor este listo...
)

echo.
echo ───────────────────────────────────────────────────────────────
echo.
echo 🏫 EduScope LAN - Gestion Academica para Redes Locales
echo.
echo 👤 Credenciales de demostracion:
echo    Profesor:    profesor@demo.com / password123
echo    Estudiante:  estudiante@demo.com / password123
echo.
echo 💡 Para detener el servidor: Presiona Ctrl+C
echo.

if "!qr_choice!"=="1" (
    echo ⚠️  IMPORTANTE: El codigo QR aparecera en la ventana del navegador
    echo    cuando el servidor este completamente iniciado.
)

pause

echo.
echo ⏳ Iniciando servidor...
echo.

REM Iniciar el servidor
node app.js

:end
echo.
echo ───────────────────────────────────────────────────────────────
echo 👋 Servidor detenido. Gracias por usar EduScope LAN!
pause
