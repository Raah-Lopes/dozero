@echo off
cd /d "%~dp0"
title Iniciar DOZERO (VTT)
echo ==============================================
echo Iniciando Servidor DOZERO...
echo ==============================================
echo.
echo O Vite abrira o servidor e detectara automaticamente
echo o seu IP para que seus amigos possam jogar.
echo.
call npm run dev
pause
