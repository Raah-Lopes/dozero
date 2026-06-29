@echo off
:: Solicita privilegios de administrador automaticamente
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Solicitando permissao de Administrador para liberar o Firewall...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo ==============================================
echo Liberando o DOZERO no Firewall do Windows...
echo ==============================================
echo.
netsh advfirewall firewall add rule name="DOZERO VTT" dir=in action=allow protocol=TCP localport=5174
echo.
echo ==============================================
echo Concluido! A porta 5174 agora esta aberta.
echo Pode fechar esta janela e tentar entrar pelo celular!
echo ==============================================
pause
