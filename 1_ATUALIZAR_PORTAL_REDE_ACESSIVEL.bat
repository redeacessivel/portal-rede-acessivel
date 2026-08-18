@echo off
chcp 65001 >nul
title Atualizar Portal Rede Acessivel
cd /d "%~dp0"

echo.
echo PORTAL REDE ACESSIVEL - PUBLICACAO
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo ERRO: O Git nao esta instalado ou nao foi encontrado.
  goto fim
)
where gh >nul 2>nul
if errorlevel 1 (
  echo ERRO: O GitHub CLI nao esta instalado ou nao foi encontrado.
  goto fim
)
gh auth status >nul 2>nul
if errorlevel 1 (
  echo A conta GitHub ainda nao esta ligada. Vai abrir o navegador.
  gh auth login -h github.com -p https -w
  if errorlevel 1 goto erro
)
git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo ERRO: Esta pasta nao e um repositorio Git.
  goto fim
)

echo A preparar os ficheiros alterados...
git add -A
git diff --cached --quiet
if not errorlevel 1 (
  echo Nao existem alteracoes novas para publicar.
  goto fim
)
git commit -m "Atualizar Portal Rede Acessivel"
if errorlevel 1 goto erro
echo A publicar no GitHub...
git push origin main
if errorlevel 1 goto erro
echo.
echo CONCLUIDO: o portal foi enviado para o GitHub.
echo Aguarde alguns minutos pela atualizacao do site.
goto fim

:erro
echo.
echo ERRO: A publicacao nao foi concluida. Leia a mensagem acima.
:fim
echo.
pause
