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
echo  2. Se abrira una ventana en tu navegador (http://localhost:3005)
echo     con el Codigo QR grande y nitido.
echo  3. En tu celular abres WhatsApp:
echo     Ajustes / Menu ^> Dispositivos vinculados ^> Vincular dispositivo
echo  4. Escaneas el QR y desde la pantalla podras:
echo     - Enviar la prueba a los 3: Luis y Julieth, Familia Galindo Moreno y Prueba Luisa
echo     - Iniciar el envio masivo a todos los 53 invitados
echo.
echo ============================================================
echo  Iniciando servidor del bot y abriendo navegador...
echo ============================================================
echo.

node enviar_boda.js

echo.
echo El proceso ha terminado.
pause
