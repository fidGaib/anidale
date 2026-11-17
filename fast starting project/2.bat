@echo off
title AniDale: client setup
setlocal

rem Папка скрипта -> корень проекта (рядом лежат server и client)
cd /d "%~dp0..\client" || exit /b 1

set /p dep=Install dependencies? y/n:
if /i "%dep%"=="y" (
    echo Installing dependencies...
    call npm i --loglevel error
)

echo Generating GraphQL types (watch mode, Ctrl+C to stop)...
call npm run codegen
