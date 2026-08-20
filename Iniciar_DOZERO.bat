@echo off
setlocal enabledelayedexpansion
title DOZERO - Painel de Inicializacao
cd /d "%~dp0"

:menu
cls
echo ========================================================
echo                 DOZERO VTT - INICIALIZADOR
echo ========================================================
echo.
echo  [1] Iniciar Servidor e abrir Mesa Direta (Mesa de Alteracoes / VTT)
echo  [2] Iniciar Servidor e abrir Menu de Boas-Vindas (Landing Page)
echo  [3] Iniciar Servidor e abrir Wiki / Compendio Direto
echo  [4] Iniciar Servidor e abrir Teatro da Mente Direto
echo  [5] Iniciar Apenas o Servidor (Sem abrir o navegador)
echo  [6] Sair
echo.
echo ========================================================
set /p opcao="Escolha uma opcao (1-6) [Padrao: 1]: "

if "%opcao%"=="" set opcao=1
if "%opcao%"=="1" goto mesa_direta
if "%opcao%"=="2" goto boas_vindas
if "%opcao%"=="3" goto wiki_direta
if "%opcao%"=="4" goto teatro_direto
if "%opcao%"=="5" goto apenas_servidor
if "%opcao%"=="6" goto sair

echo Opcao invalida! Tente novamente.
timeout /t 2 >nul
goto menu

:mesa_direta
echo.
echo [1/2] Iniciando o servidor Vite...
start "DOZERO - Servidor" cmd /k "npm run dev"
echo [2/2] Aguardando o servidor ligar...
timeout /t 3 /nobreak >nul
echo Abrindo Mesa de Alteracoes Direta...
start http://localhost:5174/vtt.html
goto final

:boas_vindas
echo.
echo [1/2] Iniciando o servidor Vite...
start "DOZERO - Servidor" cmd /k "npm run dev"
echo [2/2] Aguardando o servidor ligar...
timeout /t 3 /nobreak >nul
echo Abrindo Tela Inicial / Boas-Vindas...
start http://localhost:5174/
goto final

:wiki_direta
echo.
echo [1/2] Iniciando o servidor Vite...
start "DOZERO - Servidor" cmd /k "npm run dev"
echo [2/2] Aguardando o servidor ligar...
timeout /t 3 /nobreak >nul
echo Abrindo Wiki Direto...
start http://localhost:5174/vtt.html?view=wiki
goto final

:teatro_direto
echo.
echo [1/2] Iniciando o servidor Vite...
start "DOZERO - Servidor" cmd /k "npm run dev"
echo [2/2] Aguardando o servidor ligar...
timeout /t 3 /nobreak >nul
echo Abrindo Teatro da Mente Direto...
start http://localhost:5174/vtt.html?view=theater
goto final

:apenas_servidor
echo.
echo Iniciando servidor em primeiro plano...
call npm run dev
pause
goto menu

:final
echo.
echo ========================================================
echo  DOZERO esta rodando!
echo  Voce pode fechar esta janela mantendo o servidor ativo.
echo ========================================================
echo.
pause
exit /b

:sair
exit /b

