@echo off
title BOT DE ENVIO DE INVITACIONES DE BODA
color 0A
cls
echo ============================================================
echo   BOT DE ENVIO AUTOMATICO DE INVITACIONES DE BODA
echo   Fernando ^& Luisa Fernanda
echo ============================================================
echo.
echo 1. Iniciar envio a TODOS los invitados pendientes
echo 2. Modo PRUEBA (envia solo 1 invitacion de prueba)
echo 3. Reiniciar historial de enviados (enviar de nuevo a todos)
echo 4. Salir
echo.
set /p opcion="Elige una opcion (1, 2, 3 o 4): "

if "%opcion%"=="1" (
    echo.
    echo Iniciando bot de envio...
    node enviar_boda.js
    pause
    exit
)

if "%opcion%"=="2" (
    echo.
    echo Iniciando modo de prueba (1 mensaje)...
    node enviar_boda.js --test
    pause
    exit
)

if "%opcion%"=="3" (
    echo.
    echo Reiniciando lista de enviados...
    node enviar_boda.js --reset
    pause
    exit
)

if "%opcion%"=="4" (
    exit
)

echo Opcion invalida.
pause
