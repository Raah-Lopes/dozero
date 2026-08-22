@echo off
:: Verifica se o script já está rodando como Administrador
net session >nul 2>&1
if %errorLevel% == 0 (
    goto :admin
) else (
    goto :elevate
)

:elevate
:: Cria um script temporário em VBScript para reabrir o BAT como Administrador
echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
echo UAC.ShellExecute "cmd.exe", "/c cd /d ""%~dp0"" && ""%~s0""", "", "runas", 1 >> "%temp%\getadmin.vbs"
"%temp%\getadmin.vbs"
del "%temp%\getadmin.vbs"
exit /B

:admin
:: Executa o CMD e mantém a janela aberta na pasta atual
cd /d "%~dp0"
cmd.exe /k