@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Publicar Portal Rede Acessivel
cd /d "%~dp0"

echo.
echo PORTAL REDE ACESSIVEL - PUBLICACAO NO GITHUB
echo =============================================
echo.

where winget >nul 2>&1
if errorlevel 1 (
    echo ERRO: o winget nao existe neste Windows.
    echo Instala primeiro o Git e o GitHub CLI.
    pause
    exit /b 1
)

where git >nul 2>&1
if errorlevel 1 winget install --id Git.Git -e --accept-package-agreements --accept-source-agreements

where gh >nul 2>&1
if errorlevel 1 winget install --id GitHub.cli -e --accept-package-agreements --accept-source-agreements

set "PATH=%PATH%;%ProgramFiles%\Git\cmd;%ProgramFiles%\GitHub CLI;%LOCALAPPDATA%\Microsoft\WinGet\Links"

where git >nul 2>&1
if errorlevel 1 (
    echo Fecha esta janela e executa novamente este ficheiro.
    pause
    exit /b 1
)

where gh >nul 2>&1
if errorlevel 1 (
    echo Fecha esta janela e executa novamente este ficheiro.
    pause
    exit /b 1
)

gh auth status -h github.com >nul 2>&1
if errorlevel 1 (
    echo Vai abrir o navegador para confirmar a conta GitHub.
    echo Copia o codigo completo, incluindo o traco.
    gh auth login -h github.com -p https -w
    if errorlevel 1 goto :erro_login
)

set "UTILIZADOR="
for /f "usebackq delims=" %%U in (`gh api user --jq ".login" 2^>nul`) do set "UTILIZADOR=%%U"

if /I not "%UTILIZADOR%"=="redeacessivel" (
    echo.
    echo ERRO: a conta ligada e %UTILIZADOR%.
    echo O portal so sera publicado na conta redeacessivel.
    echo Nao publiquei nada.
    pause
    exit /b 2
)

if not exist "index.html" (
    echo ERRO: falta o ficheiro index.html nesta pasta.
    echo Extrai primeiro todo o ZIP e executa o BAT dentro da pasta extraida.
    pause
    exit /b 3
)

if not exist ".git" git init -b main
git config user.name "Portal Rede Acessivel"
git config user.email "redeacessivel@users.noreply.github.com"
git add -A
git diff --cached --quiet
if errorlevel 1 git commit -m "Publicar Portal Rede Acessivel"

gh repo view "redeacessivel/portal-rede-acessivel" >nul 2>&1
if errorlevel 1 (
    echo A criar o repositorio portal-rede-acessivel...
    gh repo create "redeacessivel/portal-rede-acessivel" --public --description "Portal acessivel com informacao, direitos, apoios e servicos publicos" --source=. --remote=origin
    if errorlevel 1 goto :erro_repositorio
)

git remote get-url origin >nul 2>&1
if errorlevel 1 git remote add origin "https://github.com/redeacessivel/portal-rede-acessivel.git"
git remote set-url origin "https://github.com/redeacessivel/portal-rede-acessivel.git"

echo A preparar a substituicao dos ficheiros antigos...
git fetch origin main:refs/remotes/origin/main >nul 2>&1

echo A enviar o portal completo...
git push --force-with-lease -u origin main
if errorlevel 1 goto :erro_envio

echo A ativar o GitHub Pages...
gh api --method POST "repos/redeacessivel/portal-rede-acessivel/pages" -f "source[branch]=main" -f "source[path]=/" >nul 2>&1
if errorlevel 1 gh api --method PUT "repos/redeacessivel/portal-rede-acessivel/pages" -f "source[branch]=main" -f "source[path]=/" >nul 2>&1

echo.
echo PUBLICACAO CONCLUIDA.
echo Repositorio: https://github.com/redeacessivel/portal-rede-acessivel
echo Portal: https://redeacessivel.github.io/portal-rede-acessivel/
echo A primeira abertura pode demorar alguns minutos.
start "" "https://github.com/redeacessivel/portal-rede-acessivel/actions"
echo.
echo IMPORTANTE PARA APARECER NO GOOGLE:
echo Depois de a publicacao terminar, abre o Google Search Console.
echo Regista o endereco completo do portal e envia este mapa do site:
echo https://redeacessivel.github.io/portal-rede-acessivel/sitemap.xml
echo.
start "" "https://search.google.com/search-console/welcome"
echo.
pause
exit /b 0

:erro_login
echo ERRO: nao foi possivel ligar a conta GitHub.
pause
exit /b 10

:erro_repositorio
echo ERRO: nao foi possivel criar o repositorio.
pause
exit /b 11

:erro_envio
echo ERRO: o repositorio existe, mas o envio dos ficheiros falhou.
echo Nao apagues nada. Copia a mensagem de erro e envia-ma.
pause
exit /b 12
