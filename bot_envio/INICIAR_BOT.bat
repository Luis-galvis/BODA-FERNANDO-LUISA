@echo off
title BOT DE ENVIO DE INVITACIONES DE BODA • BAILEYS
color 0A
cls
echo ============================================================
echo   💍 BOT DE ENVIO AUTOMATICO DE INVITACIONES DE BODA
echo   👰🤵 Fernando ^& Luisa Fernanda
echo ============================================================
echo.
echo  COMO FUNCIONA:
echo  1. Este bot conecta tu propio WhatsApp (ej: 315 9649395).
echo  2. Se abrira una ventana en tu navegador con el Codigo QR.
echo  3. En tu celular abres WhatsApp:
echo     Ajustes / Menu ^> Dispositivos vinculados ^> Vincular dispositivo
echo  4. Escaneas el QR y desde ahi podras:
echo     - Enviar una prueba a tu propio numero para verificar.
echo     - Iniciar el envio masivo a los 52 invitados automaticamente.
echo.
echo ============================================================
echo  Iniciando servidor del bot...
echo ============================================================
echo.

node enviar_boda.js

echo.
echo El proceso ha terminado.
pause
