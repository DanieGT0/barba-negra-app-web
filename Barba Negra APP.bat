@echo off
title Iniciando servidor de clientes...
cd /d %~dp0
start http://localhost:3001
node servergeneral.js
pause
