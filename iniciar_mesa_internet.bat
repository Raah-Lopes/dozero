@echo off
echo ========================================================
echo        DOZERO VTT - INICIANDO MESA PELA INTERNET
echo ========================================================
echo.
echo 1. Ligando o motor do jogo (Vite)...
start "DoZero - Motor do Jogo" cmd /k "npm run dev"

echo 2. Aguardando o servidor iniciar (5 segundos)...
timeout /t 5 /nobreak > NUL

echo 3. Configurando e iniciando o tunel da internet (Ngrok Seguro)...
call npx ngrok config add-authtoken 3FrvCkoZtLqFSm1cklYzt4yxaXD_3oeaE8GoJShX6bmiDvmsq
start "DoZero - Link da Internet" cmd /k "npx ngrok http 5174"

echo.
echo Tudo pronto! 
echo Duas janelas pretas foram abertas: uma com o servidor e uma com o tunel.
echo Procure na segunda janela por "Forwarding    https://....ngrok-free.app" (ou .dev)
echo E envie esse link para seus jogadores!
echo.
pause
