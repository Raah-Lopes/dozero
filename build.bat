@echo off
echo Corrigindo build do GitHub Pages ...

echo 1. Adicionando pasta descartavel ao gitignore ...
echo /[99] Descartaveis >> .gitignore

echo 2. Removendo arquivos do cache do Git ...
git rm -r -- cached "[99] Descartaveis"

echo 3. Salvando alteracoes ...
git add .gitignore
git commit -m "Fix: Ignorar arquivos com encoding invalido no build"

echo 4. Enviando para o GitHub ...
git push

echo Pronto! 0 build deve passar agora.
pause